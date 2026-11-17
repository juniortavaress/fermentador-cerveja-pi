// ===== Fermentador - Arduino Nano =====
// Arquivo "cola": liga os módulos. Cada módulo tem uma única responsabilidade:
//   config.h       pinos e constantes
//   sensors.*      leitura de temperatura (pot simula a caixa, NTC = ambiente)
//   actuators.*    saídas (LED = resistência, relé = arrefecimento)
//   controller.*   lógica de controle (pura, sem hardware)
//   protocol.*     formato das mensagens (igual no app web)
//   comms.h / comms_serial.cpp   transporte (USB hoje; trocar por ESP/WiFi depois)
#include "config.h"
#include "types.h"
#include "sensors.h"
#include "actuators.h"
#include "controller.h"
#include "protocol.h"
#include "comms.h"

ControlConfig cfg = {
  DEFAULT_SETPOINT,
  DEFAULT_HYSTERESIS,
  (unsigned long)(DEFAULT_MINCYCLE_MIN * 60000UL)
};
ControlState state;
bool controlEnabled = false;   // começa em espera: só controla quando o app manda RUN 1
unsigned long lastReport = 0;

void handleCommands() {
  char line[48];
  while (commsReadLine(line, sizeof(line))) {
    Command c = protocolParse(line);
    switch (c.type) {
      case CMD_SET_SP:       cfg.setPoint = c.value;                              protocolWriteConfig(commsOut(), cfg); break;
      case CMD_SET_HYST:     cfg.hysteresis = c.value;                            protocolWriteConfig(commsOut(), cfg); break;
      case CMD_SET_MINCYCLE: cfg.minCycleMs = (unsigned long)(c.value * 60000.0); protocolWriteConfig(commsOut(), cfg); break;
      case CMD_SET_RUN:
        controlEnabled = c.value > 0.5;
        if (!controlEnabled) { controllerInit(state); setHeater(false); setCooler(false); }
        commsOut().println(controlEnabled ? F("# Controle: ligado") : F("# Controle: em espera"));
        break;
      case CMD_GET_CONFIG:   protocolWriteConfig(commsOut(), cfg); break;
      case CMD_INVALID:      protocolWriteError(commsOut()); break;
      default: break;
    }
  }
}

void setup() {
  sensorsBegin();
  actuatorsBegin();
  controllerInit(state);
  commsBegin();
  commsOut().println(F("# Fermentador iniciado"));
  protocolWriteConfig(commsOut(), cfg);
}

void loop() {
  handleCommands();

  unsigned long now = millis();
  if (now - lastReport >= REPORT_INTERVAL_MS) {
    lastReport = now;

    float tChamber = readChamberTemp();
    float tAmbient = readAmbientTemp();
    if (controlEnabled) controllerUpdate(cfg, state, tChamber, tAmbient, now);
    else controllerInit(state);   // em espera: tudo desligado
    setHeater(state.heating);
    setCooler(state.cooling);

    Telemetry t = { cfg.setPoint, tChamber, tAmbient, state.heating, state.cooling, lastNtcResistanceK(), controlEnabled };
    protocolWriteTelemetry(commsOut(), t);
  }
}
