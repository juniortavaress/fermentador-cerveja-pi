// Saídas físicas. Para trocar LED/relé por driver de Peltier etc., só este módulo muda.
#pragma once

void actuatorsBegin();
void setHeater(bool on);
void setCooler(bool on);
