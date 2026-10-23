#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>

// false = send readings over the USB cable only (run `npm run usb` in backend/); true = also POST over Wi-Fi.
const bool USE_WIFI = false;

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_BACKEND_IP:3001/api/readings";
const char* deviceId = "tank-1";

// ----- Pin definitions -----
#define TDS_PIN 35
#define TURBIDITY_PIN 34
#define ONE_WIRE_BUS 4
#define TRIG_PIN 5
#define ECHO_PIN 18

// ----- Tank dimensions & JSN-SR04T ultrasonic dead-zone offset -----
const float TANK_HEIGHT_CM = 100.0;
// JSN-SR04T waterproof transducer has a ~20-25 cm minimum blind zone.
// Mount sensor >= 22 cm above full waterline so 100% full = 22 cm distance.
const float SENSOR_OFFSET_CM = 22.0;

// ----- 3.3V Hardware Calibration Constants (12-bit ADC: 0-4095) -----
// Turbidity (GPIO 34, module powered from 5V; analog out -> 1k -> GPIO 34, 2k from GPIO 34 to GND,
// so ~4.5V max becomes ~3V). The divider cancels out of the ratio below, so it needs no correction:
// raw count with the probe in clean drinking water, measured on this board. Clarity is reported as
// raw / TURB_RAW_CLEAR (the share of light still getting through compared with clean water), so this
// one reading is the only calibration needed. Re-measure it if the supply voltage or probe changes.
const int TURB_RAW_CLEAR = 2203;
// Below this the sensor is unplugged or unpowered, not reading dirty water; reported as a fault
// so a loose cable never shows up as "unfit".
const int TURB_RAW_FAULT = 30;

// ----- Two-point turbidity calibration (press BOOT, or type CAL in the Serial Monitor) -----
// Samples clean water for 5 s, gives 30 s to move the probe into cloudy water, samples that for 5 s,
// and saves both to flash. Clean then reads 100% and the cloudy sample reads CAL_CLOUDY_CLARITY,
// which sits in the backend's unfit slab (< 93%). This stretches a weak sensor's small clear-to-cloudy
// change across the slabs. Without a saved calibration, clarity falls back to raw / TURB_RAW_CLEAR.
// Type CALRESET in the Serial Monitor to go back to that fallback.
#define CAL_BUTTON_PIN 0                  // BOOT button on ESP32 dev boards
const unsigned long CAL_SAMPLE_MS = 5000;
const unsigned long CAL_SWAP_MS = 30000;
const float CAL_CLOUDY_CLARITY = 90.0;
const int CAL_MIN_GAP_RAW = 30;           // cloudy must read at least this much below clean
Preferences prefs;
int calClearRaw = 0;                      // 0 = no saved calibration
int calCloudyRaw = 0;

enum CalState { CAL_IDLE, CAL_CLEAN, CAL_SWAP, CAL_CLOUDY };
CalState calState = CAL_IDLE;
unsigned long calStateStart = 0;
long calSum = 0;
int calCount = 0;
int calCleanSample = 0;
int calLastAnnounced = 0;

const unsigned long READING_INTERVAL_MS = 5000;
unsigned long lastReadingAt = 0;
bool buttonWasDown = false;

// TDS (GPIO 35 @ 3.3V): probe cell constant K-factor & air deadband
const float TDS_K_FACTOR = 1.00;
const int TDS_AIR_DEADBAND_MV = 12; // below this the probe is out of the water

// A failed sensor is reported as NAN and sent as JSON null, so the backend never scores made-up values.
// Readings are numbered so the backend log and dashboard can be matched against this serial output.
unsigned long seq = 0;

// ----- Temperature sensor setup -----
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// Median filter over N samples to reject ESP32 Wi-Fi ADC spikes.
// millivolts = true samples calibrated millivolts instead of raw counts.
int readMedianADC(int pin, int samples = 15, bool millivolts = false) {
  int buf[15];
  int count = constrain(samples, 3, 15);
  for (int i = 0; i < count; i++) {
    buf[i] = millivolts ? analogReadMilliVolts(pin) : analogRead(pin);
    delayMicroseconds(400);
  }
  for (int i = 0; i < count - 1; i++) {
    for (int j = i + 1; j < count; j++) {
      if (buf[j] < buf[i]) {
        int tmp = buf[i];
        buf[i] = buf[j];
        buf[j] = tmp;
      }
    }
  }
  return buf[count / 2];
}

float getTDSppm(int milliVolts, float temperatureC) {
  if (milliVolts < TDS_AIR_DEADBAND_MV) return NAN; // Probe in air
  if (isnan(temperatureC)) temperatureC = 25.0;     // No temperature: skip compensation
  float voltage = milliVolts / 1000.0;
  float compensationCoefficient = 1.0 + 0.02 * (temperatureC - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  float tdsValue = (133.42 * pow(compensationVoltage, 3)
                    - 255.86 * pow(compensationVoltage, 2)
                    + 857.39 * compensationVoltage) * 0.5 * TDS_K_FACTOR;
  return max(0.0f, tdsValue);
}

float getClarityPercent(int rawADC) {
  if (rawADC < TURB_RAW_FAULT) return NAN; // Sensor disconnected
  float percent;
  if (calClearRaw > 0) {
    // Straight line through the two saved samples: clean = 100%, cloudy = CAL_CLOUDY_CLARITY.
    float drop = (float)(calClearRaw - rawADC) / (calClearRaw - calCloudyRaw);
    percent = 100.0 - drop * (100.0 - CAL_CLOUDY_CLARITY);
  } else {
    percent = ((float)rawADC / TURB_RAW_CLEAR) * 100.0;
  }
  return constrain(percent, 0.0, 100.0); // Slightly clearer than the reference still reads 100%
}

// "CAL <info|done|fail> <text>" lines; the backend's USB bridge turns them into dashboard events.
void calMessage(const char* kind, const String& text) {
  Serial.print("CAL ");
  Serial.print(kind);
  Serial.print(" ");
  Serial.println(text);
}

void loadCalibration() {
  prefs.begin("turbidity", false);
  int clear = prefs.getInt("clear", 0);
  int cloudy = prefs.getInt("cloudy", 0);
  if (clear - cloudy >= CAL_MIN_GAP_RAW && cloudy >= TURB_RAW_FAULT) {
    calClearRaw = clear;
    calCloudyRaw = cloudy;
    calMessage("info", "Using saved turbidity calibration: clean raw " + String(clear) + ", cloudy raw " + String(cloudy));
  } else {
    calMessage("info", "No turbidity calibration saved - using clean-water reference " + String(TURB_RAW_CLEAR) + ". Press BOOT to calibrate");
  }
}

void startCalibration() {
  calState = CAL_CLEAN;
  calStateStart = millis();
  calSum = 0;
  calCount = 0;
  calMessage("info", "Calibration started - keep the probe in CLEAN water (sampling 5 s)");
}

void resetCalibration() {
  prefs.clear();
  calClearRaw = 0;
  calCloudyRaw = 0;
  calMessage("done", "Calibration cleared - using clean-water reference " + String(TURB_RAW_CLEAR));
}

void finishCalibration(int clean, int cloudy) {
  if (clean < TURB_RAW_FAULT || cloudy < TURB_RAW_FAULT) {
    calMessage("fail", "Calibration failed - turbidity sensor not responding. Kept the previous setting");
    return;
  }
  if (clean - cloudy < CAL_MIN_GAP_RAW) {
    calMessage("fail", "Calibration failed - cloudy sample (raw " + String(cloudy) + ") is not cloudier than clean (raw " +
               String(clean) + "). Kept the previous setting");
    return;
  }
  calClearRaw = clean;
  calCloudyRaw = cloudy;
  prefs.putInt("clear", clean);
  prefs.putInt("cloudy", cloudy);
  calMessage("done", "Turbidity calibrated - clean raw " + String(clean) + " = 100%, cloudy raw " + String(cloudy) + " = " +
             String(CAL_CLOUDY_CLARITY, 0) + "%");
}

// Advances the calibration a step at a time so readings keep flowing while it runs.
void runCalibration() {
  if (calState == CAL_IDLE) return;
  unsigned long elapsed = millis() - calStateStart;

  if (calState == CAL_SWAP) {
    int remaining = (CAL_SWAP_MS - min(elapsed, CAL_SWAP_MS) + 999) / 1000;
    if (remaining > 0 && remaining % 10 == 0 && remaining != calLastAnnounced) {
      calLastAnnounced = remaining;
      calMessage("info", String(remaining) + " s to move the probe into CLOUDY water");
    }
    if (elapsed >= CAL_SWAP_MS) {
      calState = CAL_CLOUDY;
      calStateStart = millis();
      calSum = 0;
      calCount = 0;
      calMessage("info", "Sampling CLOUDY water for 5 s - hold the probe still");
    }
    return;
  }

  calSum += readMedianADC(TURBIDITY_PIN, 15);
  calCount++;
  if (elapsed < CAL_SAMPLE_MS) return;

  int average = calSum / calCount;
  if (calState == CAL_CLEAN) {
    calCleanSample = average;
    calMessage("info", "Clean water captured (raw " + String(average) + ") - move the probe to CLOUDY water now, 30 s");
    calState = CAL_SWAP;
    calStateStart = millis();
    calLastAnnounced = 30;
  } else {
    finishCalibration(calCleanSample, average);
    calState = CAL_IDLE;
  }
}

float getDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return NAN; // No echo

  float distance = duration * 0.0343 / 2.0;
  // Closer than the blind zone or further than the tank floor means a bad echo.
  if (distance < SENSOR_OFFSET_CM - 5 || distance > TANK_HEIGHT_CM + 5) return NAN;
  return distance;
}

float readTemperatureC() {
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  // -127 = disconnected; exactly 85 = power-on reset value, not a real reading.
  if (t == DEVICE_DISCONNECTED_C || t == 85.0) return NAN;
  return t;
}

// JSON number with 2 decimals, or null for a failed sensor.
String jsonValue(float v) {
  return isnan(v) ? String("null") : String(v, 2);
}

void printValue(const char* label, float v, const char* unit) {
  Serial.print(label);
  if (isnan(v)) Serial.println("FAULT");
  else { Serial.print(v); Serial.println(unit); }
}

void sendReading(float clarityPercent, float tdsPPM, float tempC, float levelPercent) {
  String payload = "{";
  payload += "\"deviceId\":\"" + String(deviceId) + "\",";
  payload += "\"seq\":" + String(seq) + ",";
  payload += "\"clarity\":" + jsonValue(clarityPercent) + ",";
  payload += "\"tds\":" + jsonValue(tdsPPM) + ",";
  payload += "\"temperature\":" + jsonValue(tempC) + ",";
  payload += "\"level\":" + jsonValue(levelPercent);
  payload += "}";

  // One machine-readable line for the backend's USB bridge.
  Serial.print("DATA ");
  Serial.println(payload);

  if (!USE_WIFI) return;
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int responseCode = http.POST(payload);
  Serial.print("POST response: ");
  Serial.println(responseCode);
  http.end();
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  tempSensor.begin();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(CAL_BUTTON_PIN, INPUT_PULLUP);
  Serial.setTimeout(50);
  loadCalibration();
  if (USE_WIFI) {
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("\nWiFi connected");
  }
}

void loop() {
  // BOOT button press (or "CAL" typed in the Serial Monitor) starts the two-point calibration.
  bool buttonDown = digitalRead(CAL_BUTTON_PIN) == LOW;
  if (buttonDown && !buttonWasDown && calState == CAL_IDLE) startCalibration();
  buttonWasDown = buttonDown;
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command == "CAL" && calState == CAL_IDLE) startCalibration();
    if (command == "CALRESET") resetCalibration();
  }

  runCalibration();

  if (lastReadingAt == 0 || millis() - lastReadingAt >= READING_INTERVAL_MS) {
    lastReadingAt = millis();
    takeReading();
  }
  delay(50);
}

void takeReading() {
  seq++;
  int tdsMilliVolts = readMedianADC(TDS_PIN, 15, true);
  int turbidityRaw = readMedianADC(TURBIDITY_PIN, 15);
  float tempC = readTemperatureC();

  float distance = getDistanceCM();
  float levelPercent = NAN;
  if (!isnan(distance)) {
    float waterLevel = TANK_HEIGHT_CM - distance;
    levelPercent = constrain((waterLevel / (TANK_HEIGHT_CM - SENSOR_OFFSET_CM)) * 100.0, 0, 100);
  }

  float tdsPPM = getTDSppm(tdsMilliVolts, tempC);
  float clarityPercent = getClarityPercent(turbidityRaw);

  Serial.print("---- Reading #"); Serial.print(seq); Serial.println(" ----");
  Serial.print("TDS: "); Serial.print(tdsMilliVolts); Serial.print(" mV -> "); printValue("", tdsPPM, " ppm");
  Serial.print("Clarity: Raw="); Serial.print(turbidityRaw); Serial.print(" -> "); printValue("", clarityPercent, " %");
  printValue("Temperature: ", tempC, " C");
  printValue("Water Level: ", levelPercent, " %");

  sendReading(clarityPercent, tdsPPM, tempC, levelPercent);

  Serial.println("-------------------------------------------");
}
