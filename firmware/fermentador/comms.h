// CAMADA DE TRANSPORTE. Só move linhas de texto; não entende o protocolo.
// Hoje: USB Serial (comms_serial.cpp). Para ESP: crie comms_esp.cpp com as mesmas 3 funções
// (WebSocket/TCP/UDP) e troque COMMS_TRANSPORT abaixo. O resto do firmware não muda.
#pragma once
#include <Arduino.h>

#define COMMS_SERIAL 1
#define COMMS_ESP    2
#define COMMS_TRANSPORT COMMS_SERIAL

void   commsBegin();
bool   commsReadLine(char *buf, size_t size);  // não bloqueante; true quando uma linha completa chegou
Print &commsOut();                             // para onde vão as linhas de saída
