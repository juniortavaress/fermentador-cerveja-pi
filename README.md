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

**Como usar**
1. Aba **Config.** → *Conectar dispositivo* e escolha a porta (CH340). Nas próximas vezes ele reconecta sozinho.
2. Aba **Lote** → escolha um lote (ou crie um com suas etapas: nome, temperatura, duração em horas) → *Iniciar fermentação*.
3. O app aplica o set point de cada etapa na placa e avança sozinho quando o tempo da etapa acaba. *Parar* e *Pular etapa* pedem confirmação.
4. Sem uma fermentação ativa, o set point pode ser ajustado à mão na mesma aba.

**Importante:** quem avança as etapas é o app. Ele precisa ficar aberto e conectado; se a página for fechada, ao reabrir ele recalcula em que etapa o lote deveria estar (o tempo vem do relógio). Com o ESP, essa lógica pode ir para a própria placa.

*Developer Mode* (Config.) troca a placa por um simulador, para testar sem hardware.

### Deploy na Vercel
1. Suba a pasta para um repositório no GitHub.
2. Na Vercel: *Add New Project* → importe o repositório → **Root Directory: `app`**. O preset Vite é detectado sozinho (build `npm run build`, saída `dist`).
3. A Vercel serve em HTTPS, que a Web Serial exige (localhost também vale).

Os dados (lotes, histórico, log) ficam no `localStorage` do navegador, por dispositivo.

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

**Protocolo** (texto, uma linha por mensagem, 115200 baud):
- placa → app, a cada 1 s: `SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8`
- placa → app, configuração: `# Set point: 18.0 C | Histerese: 0.5 C | Ciclo min: 3.0 min`
- app → placa: `SP 18.5`, `H 0.5`, `MC 3`, `?`

## Migrar para ESP (sem fio)

O transporte é a única parte que muda:
- **Firmware:** crie `comms_esp.cpp` com `commsBegin`, `commsReadLine` e `commsOut` (WebSocket, TCP ou MQTT) e troque `COMMS_TRANSPORT` em `comms.h`. Ajuste os pinos em `config.h`. O restante não muda.
- **App:** crie `app/src/transport/websocket.js` com a mesma interface do `serial.js` (`connect`, `disconnect`, `send`, `onLine`, `onStatus`) e use-o em `app/src/transport/index.js`. O protocolo, as etapas e as telas não mudam.
- **Atenção:** uma página em HTTPS (Vercel) não consegue abrir `ws://` ou `http://` de um ESP na rede local (conteúdo misto). Alternativas: broker MQTT por WebSocket seguro (`wss://`), um túnel/servidor com HTTPS, ou servir o app pelo próprio ESP.
