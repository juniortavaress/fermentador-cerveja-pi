// Lógica de controle PURA: sem Serial, sem pinos. Recebe leituras e decide as saídas.
#pragma once
#include "types.h"

void controllerInit(ControlState &state);
void controllerUpdate(const ControlConfig &cfg, ControlState &state,
                      float tChamber, float tAmbient, unsigned long nowMs);
