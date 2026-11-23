// Pinos e constantes de hardware. Mexa aqui ao trocar de placa (Nano -> ESP).
#pragma once
#include <Arduino.h>

// ---------- Pinos ----------
#if defined(ESP32)
// ESP32: o ADC lê de 0 a 3,3 V (12 bits). Use GPIO 32-39 (ADC1; o ADC2 não funciona com Bluetooth/Wi-Fi).
// GPIO 34-39 só entram (sem pull-up): serve para sensores.
const int PIN_HEATER  = 26;   // LED = resistência de aquecimento
const int PIN_COOLER  = 27;   // Relé = arrefecimento (ventoinha / Peltier)
const int PIN_CHAMBER = 34;   // Pot simulando a temperatura interna da caixa (3,3 V)
const int PIN_AMBIENT = 35;   // NTC da temperatura ambiente (3,3 V)
const float ADC_MAX   = 4095.0;
#else
const int PIN_HEATER  = 2;    // LED = resistência de aquecimento
const int PIN_COOLER  = 8;    // Relé = arrefecimento (ventoinha / Peltier)
const int PIN_CHAMBER = A0;   // Pot simulando a temperatura interna da caixa
const int PIN_AMBIENT = A1;   // NTC da temperatura ambiente
const float ADC_MAX   = 1023.0;
#endif

// ---------- Relé ----------
// A maioria dos módulos azuis liga com LOW. Troque para false se o seu ligar invertido.
const bool COOLER_ACTIVE_LOW = true;

// ---------- Pot (faixa simulada da caixa) ----------
const float POT_T_MIN = 0.0;
const float POT_T_MAX = 45.0;

// ---------- NTC (alimentação -> NTC -> pino ambiente -> resistor -> GND; 5 V no Nano, 3,3 V no ESP32) ----------
const float NTC_R_FIXED = 10000.0;
const float NTC_R0      = 10000.0;   // resistência a 25 °C (100000.0 se for NTC 100k)
const float NTC_BETA    = 3950.0;
const float NTC_T0_K    = 298.15;

// ---------- Limites aceitos pelos comandos ----------
const float SP_MIN = 0.0,   SP_MAX = 40.0;
const float HYST_MIN = 0.1, HYST_MAX = 5.0;
const float MINCYCLE_MAX_MIN = 30.0;

// ---------- Valores iniciais ----------
const float DEFAULT_SETPOINT     = 18.0;
const float DEFAULT_HYSTERESIS   = 0.5;
const float DEFAULT_MINCYCLE_MIN = 3.0;

const unsigned long REPORT_INTERVAL_MS = 1000;
const unsigned long SERIAL_BAUD = 115200;
