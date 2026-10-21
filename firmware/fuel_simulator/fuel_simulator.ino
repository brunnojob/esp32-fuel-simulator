#include <Arduino.h>
#include <math.h>

constexpr uint32_t PRICE_CENTS = 655;
constexpr uint32_t PULSES_PER_LITRE = 450;
constexpr uint32_t CAPACITY_ML = 50000;
constexpr uint32_t INITIAL_ML = 10000;
constexpr double FLOW_ML_PER_SECOND = 500.0;
double deliveredMl = 0;
uint32_t targetMl = 0;
uint32_t tankMl = INITIAL_ML;
uint32_t previousMs = 0;
uint32_t lastReportMs = 0;
bool running = false;
bool paused = false;
char commandBuffer[64];
size_t commandLength = 0;

void report() {
  uint32_t volume = static_cast<uint32_t>(deliveredMl);
  uint32_t cents = lround(deliveredMl * PRICE_CENTS / 1000.0);
  uint32_t pulseCount = static_cast<uint32_t>(deliveredMl * PULSES_PER_LITRE / 1000.0);
  Serial.printf("{\"litres\":%.3f,\"brl\":%.2f,\"pulses\":%lu,\"tank_litres\":%.3f,\"valve\":\"%s\"}\n", volume / 1000.0, cents / 100.0, static_cast<unsigned long>(pulseCount), (tankMl + deliveredMl) / 1000.0, running ? "OPEN" : "CLOSED");
}

void finish() {
  running = false;
  paused = false;
  report();
  tankMl += static_cast<uint32_t>(deliveredMl);
  deliveredMl = 0;
}

void command(char *text) {
  if (strcmp(text, "PAUSE") == 0 && running) { running = false; paused = true; report(); return; }
  if (strcmp(text, "RESUME") == 0 && paused) { paused = false; running = true; previousMs = millis(); return; }
  if (strcmp(text, "STOP") == 0 && (running || paused)) { finish(); return; }
  if (running || paused) { Serial.println("BUSY"); return; }
  if (strcmp(text, "RESET") == 0) { tankMl = INITIAL_ML; deliveredMl = 0; report(); return; }
  double value = 0;
  char extra;
  uint32_t requestedMl = 0;
  if (strcmp(text, "FULL") == 0) requestedMl = CAPACITY_ML - tankMl;
  else if (sscanf(text, "MONEY %lf %c", &value, &extra) == 1 && isfinite(value) && value > 0 && value <= 10000) requestedMl = static_cast<uint32_t>(lround(value * 100) * 1000ULL / PRICE_CENTS);
  else if (sscanf(text, "LITRES %lf %c", &value, &extra) == 1 && isfinite(value) && value > 0 && value <= 200) requestedMl = lround(value * 1000);
  else { Serial.println("INVALID COMMAND"); return; }
  targetMl = min(requestedMl, CAPACITY_ML - tankMl);
  if (targetMl == 0) { Serial.println("TANK FULL OR ZERO VOLUME"); return; }
  deliveredMl = 0;
  running = true;
  previousMs = millis();
}

void setup() {
  Serial.begin(115200);
  Serial.println("FUEL LAB | MONEY 100 | LITRES 10 | FULL | PAUSE | RESUME | STOP | RESET");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { commandBuffer[commandLength] = '\0'; command(commandBuffer); commandLength = 0; }
    else if (c != '\r') {
      if (commandLength < sizeof(commandBuffer) - 1) commandBuffer[commandLength++] = c;
      else { commandLength = 0; Serial.println("COMMAND TOO LONG"); }
    }
  }
  uint32_t now = millis();
  if (running) {
    deliveredMl = fmin(targetMl, deliveredMl + FLOW_ML_PER_SECOND * (now - previousMs) / 1000.0);
    previousMs = now;
    if (deliveredMl >= targetMl) finish();
    else if (now - lastReportMs >= 250) { lastReportMs = now; report(); }
  }
}
