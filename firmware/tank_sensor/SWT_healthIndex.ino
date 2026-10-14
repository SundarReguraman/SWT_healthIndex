#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>

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
// Turbidity (GPIO 34 @ 3.3V): ~800+ raw counts in clear water, ~95 in cloudy water
const int TURB_RAW_CLEAR = 800;
const int TURB_RAW_CLOUDY = 95;

// TDS (GPIO 35 @ 3.3V): probe cell constant K-factor & air deadband
const float TDS_K_FACTOR = 1.00;
const int TDS_AIR_DEADBAND_RAW = 15;

// Cached fallback state so a single missed echo never blocks water-quality POSTs
float lastValidLevelPercent = 75.0;
float lastValidTempC = 32.5;

// ----- Temperature sensor setup -----
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// Median filter over N samples to reject ESP32 Wi-Fi ADC spikes
int readMedianADC(int pin, int samples = 15) {
  int buf[15];
  int count = constrain(samples, 3, 15);
  for (int i = 0; i < count; i++) {
    buf[i] = analogRead(pin);
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

float getTDSppm(int rawADC, float voltage, float temperatureC) {
  if (rawADC < TDS_AIR_DEADBAND_RAW) return 0.0; // Probe in air
  float compensationCoefficient = 1.0 + 0.02 * (temperatureC - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  float tdsValue = (133.42 * pow(compensationVoltage, 3)
                    - 255.86 * pow(compensationVoltage, 2)
                    + 857.39 * compensationVoltage) * 0.5 * TDS_K_FACTOR;
  return max(0.0f, tdsValue);
}

float getClarityPercent(int rawADC) {
  float span = (float)(TURB_RAW_CLEAR - TURB_RAW_CLOUDY);
  if (span <= 0) return 0.0;
  float percent = ((float)(rawADC - TURB_RAW_CLOUDY) / span) * 100.0;
  percent = constrain(percent, 0.0, 100.0);
  return percent;
}

float getDistanceCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;

  float distance = duration * 0.0343 / 2.0;
  return distance;
}

void sendReading(float clarityPercent, float tdsPPM, float tempC, float levelPercent) {
  String payload = "{";
  payload += "\"deviceId\":\"" + String(deviceId) + "\",";
  payload += "\"clarity\":" + String(clarityPercent, 2) + ",";
  payload += "\"tds\":" + String(tdsPPM, 2) + ",";
  payload += "\"temperature\":" + String(tempC, 2) + ",";
  payload += "\"level\":" + String(levelPercent, 2);
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
  int tdsRaw = readMedianADC(TDS_PIN, 15);
  float tdsVoltage = analogReadMilliVolts(TDS_PIN) / 1000.0;

  int turbidityRaw = readMedianADC(TURBIDITY_PIN, 15);
  float turbidityVoltage = analogReadMilliVolts(TURBIDITY_PIN) / 1000.0;

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  if (tempC != DEVICE_DISCONNECTED_C) {
    lastValidTempC = tempC;
  } else {
    tempC = lastValidTempC;
  }

  float distance = getDistanceCM();
  float levelPercent = -1;
  if (distance != -1) {
    float waterLevel = TANK_HEIGHT_CM - distance;
    levelPercent = (waterLevel / (TANK_HEIGHT_CM - SENSOR_OFFSET_CM)) * 100.0;
    levelPercent = constrain(levelPercent, 0, 100);
    lastValidLevelPercent = levelPercent;
  } else {
    levelPercent = lastValidLevelPercent;
  }

  float tdsPPM = getTDSppm(tdsRaw, tdsVoltage, tempC);
  float clarityPercent = getClarityPercent(turbidityRaw);

  Serial.println("---- Sensor Readings (3.3V Calibrated) ----");
  Serial.print("TDS: Raw="); Serial.print(tdsRaw); Serial.print(" -> "); Serial.print(tdsPPM); Serial.println(" ppm");
  Serial.print("Clarity: Raw="); Serial.print(turbidityRaw); Serial.print(" -> "); Serial.print(clarityPercent); Serial.println(" %");
  Serial.print("Temperature: "); Serial.print(tempC); Serial.println(" °C");
  Serial.print("Water Level: "); Serial.print(levelPercent); Serial.println(" %");

  sendReading(clarityPercent, tdsPPM, tempC, levelPercent);

  Serial.println("-------------------------------------------");
  delay(5000);
}