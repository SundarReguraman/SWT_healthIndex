#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>

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

// ----- Tank dimensions - adjust to your tank -----
const float TANK_HEIGHT_CM = 100.0;
const float SENSOR_OFFSET_CM = 2.0;

// ----- Temperature sensor setup -----
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

float getTDSppm(float voltage, float temperatureC) {
  float compensationCoefficient = 1.0 + 0.02 * (temperatureC - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  float tdsValue = (133.42 * pow(compensationVoltage, 3)
                    - 255.86 * pow(compensationVoltage, 2)
                    + 857.39 * compensationVoltage) * 0.5;
  return tdsValue;
}

float getClarityPercent(float voltage) {
  float minV = 1.40;
  float maxV = 1.70;
  float percent = ((voltage - minV) / (maxV - minV)) * 100.0;
  percent = constrain(percent, 0, 100);
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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"deviceId\":\"" + String(deviceId) + "\",";
  payload += "\"clarity\":" + String(clarityPercent, 2) + ",";
  payload += "\"tds\":" + String(tdsPPM, 2) + ",";
  payload += "\"temperature\":" + String(tempC, 2) + ",";
  payload += "\"level\":" + String(levelPercent, 2);
  payload += "}";

  int responseCode = http.POST(payload);
  Serial.print("POST response: ");
  Serial.println(responseCode);
  Serial.println(payload);
  http.end();
}

void setup() {
  Serial.begin(115200);
  tempSensor.begin();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void loop() {
  int tdsRaw = analogRead(TDS_PIN);
  float tdsVoltage = tdsRaw * (3.3 / 4095.0);

  int turbidityRaw = analogRead(TURBIDITY_PIN);
  float turbidityVoltage = turbidityRaw * (3.3 / 4095.0);

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  float distance = getDistanceCM();
  float levelPercent = -1;
  if (distance != -1) {
    float waterLevel = TANK_HEIGHT_CM - distance;
    levelPercent = (waterLevel / (TANK_HEIGHT_CM - SENSOR_OFFSET_CM)) * 100.0;
    levelPercent = constrain(levelPercent, 0, 100);
  }

  float tdsPPM = tempC == DEVICE_DISCONNECTED_C ? 0 : getTDSppm(tdsVoltage, tempC);
  float clarityPercent = getClarityPercent(turbidityVoltage);

  Serial.println("---- Sensor Readings ----");

  Serial.print("TDS: ");
  Serial.print(tdsPPM);
  Serial.println(" ppm");

  Serial.print("Clarity: ");
  Serial.print(clarityPercent);
  Serial.println(" %");

  if (tempC == DEVICE_DISCONNECTED_C) {
    Serial.println("Temperature: Error");
  } else {
    Serial.print("Temperature: ");
    Serial.print(tempC);
    Serial.println(" °C");
  }

  if (levelPercent == -1) {
    Serial.println("Water Level: No echo - check wiring/range");
  } else {
    Serial.print("Water Level: ");
    Serial.print(levelPercent);
    Serial.println(" %");
  }

  if (tempC != DEVICE_DISCONNECTED_C && levelPercent != -1) {
    sendReading(clarityPercent, tdsPPM, tempC, levelPercent);
  }

  Serial.println("--------------------------");
  delay(5000);
}