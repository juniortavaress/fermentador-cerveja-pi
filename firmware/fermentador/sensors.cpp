#include <Arduino.h>
#include "config.h"
#include "sensors.h"

static float rNtcK = -0.001;

static float readAnalogAverage(int pin) {
  analogRead(pin);          // descarta a 1ª leitura após trocar de canal
  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return sum / 16.0;
}

void sensorsBegin() {}

float readChamberTemp() {
  float adc = readAnalogAverage(PIN_CHAMBER);
  return POT_T_MIN + (adc / ADC_MAX) * (POT_T_MAX - POT_T_MIN);
}

float readAmbientTemp() {
  float adc = readAnalogAverage(PIN_AMBIENT);
  if (adc < 1 || adc > ADC_MAX - 1) {
    rNtcK = -0.001;
    return NAN;
  }
  float r = NTC_R_FIXED * (ADC_MAX / adc - 1.0);
  rNtcK = r / 1000.0;
  float tK = 1.0 / (1.0 / NTC_T0_K + log(r / NTC_R0) / NTC_BETA);
  return tK - 273.15;
}

float lastNtcResistanceK() { return rNtcK; }
