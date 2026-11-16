// Tipos compartilhados entre os módulos do firmware.
#pragma once
#include <Arduino.h>

// Configuração ajustável em tempo de execução (via comandos do protocolo).
struct ControlConfig {
  float setPoint;             // °C
  float hysteresis;           // °C (delta T)
  unsigned long minCycleMs;   // tempo mínimo entre mudanças de estado do arrefecimento (0 = sem limite)
};

// Estado das saídas.
struct ControlState {
  bool heating;
  bool cooling;
  unsigned long coolingChangedAt;
  bool coolingEverChanged;
};

// Uma leitura completa do sistema.
struct Telemetry {
  float setPoint;
  float tChamber;   // temperatura interna da caixa
  float tAmbient;   // NAN se o sensor estiver ausente
  bool heating;
  bool cooling;
  float rNtcK;      // resistência do NTC em kΩ (<= 0 se sensor ausente)
};

// Comando recebido do app.
enum CommandType { CMD_NONE, CMD_SET_SP, CMD_SET_HYST, CMD_SET_MINCYCLE, CMD_GET_CONFIG, CMD_INVALID };

struct Command {
  CommandType type;
  float value;
};
