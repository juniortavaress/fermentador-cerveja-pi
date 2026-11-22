// CAMADA DE TRANSPORTE. Só move linhas de texto; não entende o protocolo.
// Hoje: USB Serial (comms_serial.cpp). ESP32: comms_ble.cpp (Bluetooth LE, serviço Nordic UART). O resto do firmware não muda.
#pragma once
#include <Arduino.h>

#define COMMS_SERIAL 1
#define COMMS_BLE    2
#if defined(ESP32)
#define COMMS_TRANSPORT COMMS_BLE      // ESP32: Bluetooth (celular) + USB espelhado
#else
#define COMMS_TRANSPORT COMMS_SERIAL
#endif

void   commsBegin();
bool   commsReadLine(char *buf, size_t size);  // não bloqueante; true quando uma linha completa chegou
Print &commsOut();                             // para onde vão as linhas de saída
