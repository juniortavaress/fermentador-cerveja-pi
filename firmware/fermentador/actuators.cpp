#include <Arduino.h>
#include "config.h"
#include "actuators.h"

void setHeater(bool on) {
  digitalWrite(PIN_HEATER, on ? HIGH : LOW);
}

void setCooler(bool on) {
  if (COOLER_ACTIVE_LOW) digitalWrite(PIN_COOLER, on ? LOW : HIGH);
  else                   digitalWrite(PIN_COOLER, on ? HIGH : LOW);
}

void actuatorsBegin() {
  pinMode(PIN_HEATER, OUTPUT);
  pinMode(PIN_COOLER, OUTPUT);
  setCooler(false);
  setHeater(false);
}
