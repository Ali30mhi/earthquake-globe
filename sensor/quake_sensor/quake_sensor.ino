/*
  Quake Sensor — on-site shaking detector for the Live Earthquake Globe
  Hardware: ESP32 dev board + MPU6050 (GY-521) accelerometer + active buzzer
  - Detects sudden shaking with an STA/LTA trigger and sounds the buzzer
  - Streams live data over WebSocket on port 81 (local Wi-Fi only, no internet needed)
  - The buzzer alarm works even without any Wi-Fi
*/
#include <WiFi.h>
#include <ESPmDNS.h>
#include <Wire.h>
#include <WebSocketsServer.h>

// ===== 1) Your Wi-Fi =====
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// ===== 2) Pins =====
const int PIN_SDA = 21;
const int PIN_SCL = 22;
const int PIN_BUZZER = 25;
const int PIN_LED = 2;

// ===== 3) Detection tuning =====
const float FS = 100.0f;            // samples per second
const float STA_SEC = 0.5f;         // short-term average window
const float LTA_SEC = 30.0f;        // long-term average window (background noise)
const float TRIGGER_RATIO = 4.0f;   // STA/LTA above this = shaking
const float MIN_STA_MG = 6.0f;      // ignore weaker motion (MPU6050 noise floor)
const float HOLD_SEC = 0.3f;        // ratio must stay high this long
const float WARMUP_SEC = 30.0f;     // learn background noise after power-on
const float COOLDOWN_SEC = 20.0f;   // no new alarm right after one ends
const float MAX_ALARM_SEC = 30.0f;
const float TEST_ALARM_SEC = 3.0f;

const uint8_t MPU_ADDR = 0x68;
const int BATCH = 10;               // samples per WebSocket message (10 msgs/s)

WebSocketsServer ws(81);

float hx = 0, hy = 0, hz = 0, px = 0, py = 0, pz = 0;
float sta = 0, lta = 0, peak = 0;
bool alarmOn = false, testAlarm = false, mdnsStarted = false;
unsigned long alarmStart = 0, lastAlarmEnd = 0, bootMs = 0, nextSample = 0;
int above = 0, below = 0, batchN = 0;
float batch[BATCH];

void mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

bool mpuRead(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, (uint8_t)6) != 6) return false;
  uint8_t b[6];
  for (int i = 0; i < 6; i++) b[i] = Wire.read();
  ax = (int16_t)((b[0] << 8) | b[1]) / 16.384f;   // milli-g at +-2 g
  ay = (int16_t)((b[2] << 8) | b[3]) / 16.384f;
  az = (int16_t)((b[4] << 8) | b[5]) / 16.384f;
  return true;
}

void startAlarm(float ratio, bool test) {
  alarmOn = true;
  testAlarm = test;
  alarmStart = millis();
  peak = 0;
  below = 0;
  String msg = "{\"t\":\"e\",\"r\":";
  msg += String(ratio, 1);
  msg += ",\"test\":";
  msg += test ? 1 : 0;
  msg += "}";
  ws.broadcastTXT(msg);
  Serial.println(test ? "Test alarm" : "SHAKING DETECTED");
}

void stopAlarm() {
  alarmOn = false;
  lastAlarmEnd = millis();
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, LOW);
  String msg = "{\"t\":\"x\",\"p\":";
  msg += String(peak, 1);
  msg += ",\"d\":";
  msg += String((millis() - alarmStart) / 1000.0f, 1);
  msg += "}";
  ws.broadcastTXT(msg);
}

void onWsEvent(uint8_t num, WStype_t type, uint8_t *payload, size_t length) {
  if (type == WStype_CONNECTED) {
    String hello = "{\"t\":\"h\",\"fs\":";
    hello += (int)FS;
    hello += ",\"name\":\"quake-sensor\",\"v\":1}";
    ws.sendTXT(num, hello);
  } else if (type == WStype_TEXT) {
    if (length == 4 && memcmp(payload, "test", 4) == 0) startAlarm(0, true);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);
  mpuWrite(0x6B, 0x00);   // wake up
  mpuWrite(0x1C, 0x00);   // accelerometer range +-2 g
  mpuWrite(0x1A, 0x03);   // digital low-pass filter ~44 Hz
  delay(100);
  float ax = 0, ay = 0, az = 0;
  if (mpuRead(ax, ay, az)) Serial.println("MPU6050 OK");
  else Serial.println("MPU6050 NOT FOUND - check wiring: VCC=3V3, GND, SDA=21, SCL=22");
  px = ax; py = ay; pz = az;

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(300);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) Serial.println("No Wi-Fi yet - the buzzer alarm still works. Retrying in background.");

  ws.begin();
  ws.onEvent(onWsEvent);

  for (int i = 0; i < 2; i++) {   // two short beeps = ready
    digitalWrite(PIN_BUZZER, HIGH); delay(80);
    digitalWrite(PIN_BUZZER, LOW); delay(120);
  }
  bootMs = millis();
  nextSample = micros();
}

void loop() {
  ws.loop();
  if (mdnsStarted == false && WiFi.status() == WL_CONNECTED) {
    mdnsStarted = true;
    Serial.print("Sensor address: ");
    Serial.println(WiFi.localIP());
    if (MDNS.begin("quake-sensor")) Serial.println("Also reachable as quake-sensor.local");
  }

  unsigned long now = micros();
  if ((long)(now - nextSample) < 0) { delay(1); return; }
  nextSample += (unsigned long)(1000000.0f / FS);
  if ((long)(now - nextSample) > 100000L) nextSample = now;

  float ax = 0, ay = 0, az = 0;
  if (mpuRead(ax, ay, az) == false) return;

  // High-pass filter (~0.5 Hz) removes gravity and slow tilt
  const float A = 0.97f;
  hx = A * (hx + ax - px);
  hy = A * (hy + ay - py);
  hz = A * (hz + az - pz);
  px = ax; py = ay; pz = az;
  float m = sqrtf(hx * hx + hy * hy + hz * hz);

  float elapsed = (millis() - bootMs) / 1000.0f;
  bool warm = elapsed < WARMUP_SEC;
  sta += (m - sta) / (STA_SEC * FS);
  if (alarmOn == false) lta += (m - lta) / ((warm ? 2.0f : LTA_SEC) * FS);
  float ratio = sta / fmaxf(lta, 0.5f);

  if (alarmOn) {
    peak = fmaxf(peak, m);
    bool on = ((millis() - alarmStart) / 200) % 2 == 0;
    digitalWrite(PIN_BUZZER, on ? HIGH : LOW);
    digitalWrite(PIN_LED, on ? HIGH : LOW);
    below = ratio < 1.5f ? below + 1 : 0;
    float dur = (millis() - alarmStart) / 1000.0f;
    if (testAlarm ? dur > TEST_ALARM_SEC : (below > 2 * FS || dur > MAX_ALARM_SEC)) stopAlarm();
  } else if (warm == false && millis() - lastAlarmEnd > COOLDOWN_SEC * 1000) {
    above = (ratio > TRIGGER_RATIO && sta > MIN_STA_MG) ? above + 1 : 0;
    if (above >= HOLD_SEC * FS) {
      above = 0;
      startAlarm(ratio, false);
    }
  }

  batch[batchN++] = m;
  if (batchN >= BATCH) {
    float bmax = 0;
    String msg = "{\"t\":\"d\",\"s\":[";
    for (int i = 0; i < BATCH; i++) {
      if (i) msg += ',';
      msg += String(batch[i], 1);
      bmax = fmaxf(bmax, batch[i]);
    }
    msg += "],\"r\":";
    msg += String(ratio, 2);
    msg += ",\"p\":";
    msg += String(alarmOn ? peak : bmax, 1);
    msg += ",\"a\":";
    msg += alarmOn ? 1 : 0;
    msg += ",\"w\":";
    msg += warm ? (int)(WARMUP_SEC - elapsed) : 0;
    msg += "}";
    ws.broadcastTXT(msg);
    batchN = 0;
  }
}
// end of quake_sensor.ino
