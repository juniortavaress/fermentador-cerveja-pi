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
1. Aba **Ajustes** (ou o botão "Conectar placa" no Início) → escolha a porta (CH340). Nas próximas vezes ele reconecta sozinho.
2. Aba **Lotes** → toque em um lote (ou crie um em "+ Novo lote", com nome, temperatura e duração de cada etapa) → *Iniciar fermentação*.
3. O app volta ao **Início**, aplica a temperatura de cada etapa na placa e avança sozinho quando o tempo acaba. *Pular etapa* e *Parar* ficam ali e pedem confirmação.
4. Sem fermentação ativa, a temperatura desejada pode ser ajustada com − / + no Início.
5. **Histórico** mostra o gráfico de temperatura e os eventos (alertas, etapas, conexão).

No computador o app aparece dentro de uma moldura de celular; num celular ocupa a tela toda.

**Modo dev (sem o circuito).** No computador, em **Ajustes > Modo dev**, o app troca a placa por uma simulada e mostra o circuito ao lado do celular: o **potenciômetro** define a **temperatura interna** e o **NTC** o ambiente (fixo, definido por quem usa). A **mola** esquenta (laranja/vermelha) quando a resistência liga e a **ventoinha** gira quando o resfriador liga. Funciona em qualquer navegador (não precisa de Web Serial). No celular (sem o painel do circuito), o menu de três pontos do lote ganha **Simular**: inicia a fermentação e a simulação move sozinha a temperatura interna e a do ambiente; ela para sozinha quando a fermentação termina ou é encerrada.

**Importante:** quem avança as etapas é o app. Ele precisa ficar aberto e conectado; se a página for fechada, ao reabrir ele recalcula em que etapa o lote deveria estar (o tempo vem do relógio). Com o ESP, essa lógica pode ir para a própria placa.

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

**Espera:** a placa liga em espera (resfriador e resistência desligados) e só controla a temperatura depois de `RUN 1`. O app manda `RUN 1` ao iniciar uma fermentação e `RUN 0` ao parar ou terminar.

**Lógica:** o arrefecimento (Peltier) fica ligado direto quando o set point é menor que o ambiente, com tempo mínimo entre ciclos. A resistência faz o controle fino com histerese (delta T).

**Protocolo** (texto, uma linha por mensagem, 115200 baud):
- placa → app, a cada 1 s: `SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8,On:1` (`On:0` = em espera)
- placa → app, configuração: `# Set point: 18.0 C | Histerese: 0.5 C | Ciclo min: 3.0 min`
- app → placa: `SP 18.5`, `H 0.5`, `MC 3`, `RUN 1`, `?`

## Migrar para ESP (sem fio)

O transporte é a única parte que muda:
- **Firmware:** crie `comms_esp.cpp` com `commsBegin`, `commsReadLine` e `commsOut` (WebSocket, TCP ou MQTT) e troque `COMMS_TRANSPORT` em `comms.h`. Ajuste os pinos em `config.h`. O restante não muda.
- **App:** crie `app/src/transport/websocket.js` com a mesma interface do `serial.js` (`connect`, `disconnect`, `send`, `onLine`, `onStatus`) e use-o em `app/src/transport/index.js`. O protocolo, as etapas e as telas não mudam.
- **Atenção:** uma página em HTTPS (Vercel) não consegue abrir `ws://` ou `http://` de um ESP na rede local (conteúdo misto). Alternativas: broker MQTT por WebSocket seguro (`wss://`), um túnel/servidor com HTTPS, ou servir o app pelo próprio ESP.
