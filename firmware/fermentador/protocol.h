// PROTOCOLO de texto (independente do transporte). O app web usa o mesmo formato.
//
//  Placa -> app:
//    SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8,On:1  (a cada 1 s; On:0 = em espera)
//    # Set point: 18.0 C | Histerese: 0.5 C | Ciclo min: 3.0 min   (configuração)
//  App -> placa:
//    SP 18.5   define o set point (0 a 40)
//    H 0.5     define a histerese / delta T (0.1 a 5)
//    MC 3      tempo mínimo entre mudanças do arrefecimento, em minutos (0 a 30; 0 = sem limite)
//    RUN 1     liga o controle (fermentação ativa); RUN 0 = espera, com resistência e resfriador desligados
//    ?         pede a configuração
#pragma once
#include <Arduino.h>
#include "types.h"

Command protocolParse(const char *line);
void    protocolWriteTelemetry(Print &out, const Telemetry &t);
void    protocolWriteConfig(Print &out, const ControlConfig &cfg);
void    protocolWriteError(Print &out);
