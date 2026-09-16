#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_BACKEND_IP:3001/api/readings"; // use your machine's LAN IP, not localhost

// TODO: set these to your actual wiring
const int turbidityPin = 34;
const int tdsPin = 35;
const int tempPin = 32;
const int trigPin = 5;
const int echoPin = 18;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

float readAveraged(int pin, int samples) {
  long total = 0;
  for (int i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(10);
  }
  return total / (float)samples;
}

float readTurbidity() {
  float raw = readAveraged(turbidityPin, 15);
  // TODO: replace with your real calibration curve (raw -> NTU)
  return raw * (100.0 / 4095.0);
}

float readTDS() {
  float raw = readAveraged(tdsPin, 15);
  // TODO: replace with your real calibration curve (raw -> ppm), ideally temperature-compensated
  return raw * (500.0 / 4095.0);
}

float readTemperature() {
  float raw = readAveraged(tempPin, 15);
  // TODO: replace with your sensor's real conversion formula
  float voltage = raw * (3.3 / 4095.0);
  return voltage * 100.0;
}

float readLevelPercent() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  float distanceCm = duration * 0.0343 / 2.0;
  // TODO: set your actual tank height in cm
  float tankHeightCm = 100.0;
  float levelPct = 100.0 * (1.0 - (distanceCm / tankHeightCm));
  if (levelPct < 0) levelPct = 0;
  if (levelPct > 100) levelPct = 100;
  return levelPct;
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    float turbidity = readTurbidity();
    float tds = readTDS();
    float temperature = readTemperature();
    float level = readLevelPercent();

    String payload = "{";
    payload += "\"deviceId\":\"tank-1\",";
    payload += "\"turbidity\":" + String(turbidity, 2) + ",";
    payload += "\"tds\":" + String(tds, 2) + ",";
    payload += "\"temperature\":" + String(temperature, 2) + ",";
    payload += "\"level\":" + String(level, 2);
    payload += "}";

    int responseCode = http.POST(payload);
    Serial.print("POST response: ");
    Serial.println(responseCode);
    Serial.println(payload);
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
  delay(5000);
}
