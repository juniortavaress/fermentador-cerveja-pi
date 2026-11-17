# Fermentador

Controle de fermentação: um app web (React) que lê a temperatura de uma placa Arduino e roda fermentações por etapas.

```
PI/
├── app/                  App web (React + Vite, JavaScript)
└── firmware/fermentador/ Código do Arduino Nano (modular)
```

## App web (`app/`)

```bash
cd app
npm install
npm run dev     # http://localhost:5173
npm test        # 51 testes
npm run build   # gera dist/
```

Use **Chrome ou Edge**: a conexão USB usa a Web Serial API (não existe no Firefox/Safari).
Feche o Monitor Serial da Arduino IDE antes de conectar: só um programa usa a porta por vez.

**Modo dev (sem o circuito).** No computador, em **Ajustes > Modo dev**, o app troca a placa por uma simulada e mostra o circuito ao lado do celular: o **potenciômetro** define a **temperatura interna** e o **NTC** o ambiente (fixo, definido por quem usa). No celular (sem o painel do circuito), o menu de três pontos do lote ganha **Simular**: inicia a fermentação e a simulação move sozinha a temperatura interna e a do ambiente; ela para sozinha quando a fermentação termina ou é encerrada.

## Firmware (`firmware/fermentador/`)

Compilar e enviar (com o `arduino-cli`, ou abrindo a pasta na Arduino IDE): placa **Arduino Nano**, processador **ATmega328P (Old Bootloader)**.

| Arquivo | Responsabilidade |
|---|---|
| `fermentador.ino` | liga os módulos (setup/loop) |
| `config.h` | pinos e constantes |
| `sensors.*` | leitura de temperatura (pot simula a caixa, NTC = ambiente) |
| `actuators.*` | saídas (LED = resistência, relé = arrefecimento) |
| `controller.*` | lógica de controle, pura (sem pinos nem Serial) |
| `protocol.*` | formato das mensagens de texto |
| `comms.h`, `comms_serial.cpp` | transporte (USB Serial) |


**Lógica:** o arrefecimento (Peltier) fica ligado direto quando o set point é menor que o ambiente, com tempo mínimo entre ciclos. A resistência faz o controle fino com histerese (delta T).


