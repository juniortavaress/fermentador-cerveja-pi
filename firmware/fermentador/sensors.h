// Leitura dos sensores. Para usar sensores reais (DS18B20, NTC na caixa...), só este módulo muda.
#pragma once

void  sensorsBegin();
float readChamberTemp();      // °C
float readAmbientTemp();      // °C, NAN se fio solto/curto
float lastNtcResistanceK();   // kΩ da última leitura do NTC (-0.001 se ausente)
