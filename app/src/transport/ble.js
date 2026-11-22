// Bluetooth Low Energy pelo navegador (Web Bluetooth: Chrome/Edge no Android e no PC; não existe no iPhone/Safari).
// Funciona só em HTTPS ou localhost. Usa o serviço Nordic UART (NUS), uma "serial por Bluetooth":
// o ESP32 manda linhas de texto por notificação (TX) e recebe comandos por escrita (RX).
// Mesmo contrato do SerialTransport (veja serial.js).

export const NUS_SERVICE = "6e400001-b5a3-f393-a6e3-43dcd7a8d9ae"
export const NUS_RX = "6e400002-b5a3-f393-a6e3-43dcd7a8d9ae" // app -> placa (escrita)
export const NUS_TX = "6e400003-b5a3-f393-a6e3-43dcd7a8d9ae" // placa -> app (notificação)

const CHUNK = 20 // cabe em qualquer MTU padrão do BLE (23 - 3)

function getBluetooth() {
  if (typeof navigator === "undefined") return null
  return navigator.bluetooth ?? null
}

export function isBleSupported() {
  return getBluetooth() !== null
}

function describeError(e) {
  console.warn("Falha ao conectar por Bluetooth:", e)
  return "Falha ao conectar"
}

export class BleTransport {
  kind = "ble"

  device = null
  server = null
  rx = null
  tx = null
  buffer = ""
  decoder = new TextDecoder()
  writeChain = Promise.resolve()
  closing = false
  lineCbs = new Set()
  statusCbs = new Set()

  onLine(cb) {
    this.lineCbs.add(cb)
    return () => this.lineCbs.delete(cb)
  }

  onStatus(cb) {
    this.statusCbs.add(cb)
    return () => this.statusCbs.delete(cb)
  }

  emitStatus(status, detail) {
    this.statusCbs.forEach((cb) => cb(status, detail))
  }

  /** `auto: true` tenta reaproveitar um aparelho já autorizado, sem abrir a janela de escolha. */
  async connect(opts = {}) {
    const bt = getBluetooth()
    if (!bt) {
      this.emitStatus("error", "Conexão indisponível neste navegador")
      return false
    }

    if (!this.device) {
      if (opts.auto) {
        // getDevices() ainda não existe em todo Chrome: se faltar, o usuário toca em "Conectar fermentador".
        const known = typeof bt.getDevices === "function" ? await bt.getDevices().catch(() => []) : []
        if (known.length === 0) return false
        this.device = known[0]
      } else {
        try {
          this.device = await bt.requestDevice({ filters: [{ services: [NUS_SERVICE] }] })
        } catch {
          return false // o usuário fechou a janela de escolha
        }
      }
      this.device.addEventListener("gattserverdisconnected", () => this.handleDrop())
    }

    this.emitStatus("connecting")
    try {
      this.server = await this.device.gatt.connect()
      const service = await this.server.getPrimaryService(NUS_SERVICE)
      this.rx = await service.getCharacteristic(NUS_RX)
      this.tx = await service.getCharacteristic(NUS_TX)
      this.tx.addEventListener("characteristicvaluechanged", (ev) => this.handleChunk(ev.target.value))
      await this.tx.startNotifications()
    } catch (e) {
      try { this.device?.gatt?.disconnect() } catch { /* ignore */ }
      this.server = this.rx = this.tx = null
      this.emitStatus("error", describeError(e))
      return false
    }

    this.closing = false
    this.buffer = ""
    this.emitStatus("connected")
    return true
  }

  handleChunk(view) {
    this.buffer += this.decoder.decode(view, { stream: true })
    let idx
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim()
      this.buffer = this.buffer.slice(idx + 1)
      if (line) this.lineCbs.forEach((cb) => cb(line))
    }
  }

  handleDrop() {
    const wasClosing = this.closing
    this.server = this.rx = this.tx = null
    this.emitStatus("disconnected", wasClosing ? undefined : "Dispositivo desconectado.")
  }

  async disconnect() {
    if (!this.server) return
    this.closing = true
    try { this.device.gatt.disconnect() } catch { /* ignore */ }
    // gattserverdisconnected dispara handleDrop
  }

  /** Escritas em fila e em pedaços de 20 bytes: o BLE não aceita escrever antes da anterior terminar. */
  async send(line) {
    if (!this.rx) throw new Error("Não conectado")
    const bytes = new TextEncoder().encode(line + "\n")
    const rx = this.rx
    const job = this.writeChain.then(async () => {
      for (let i = 0; i < bytes.length; i += CHUNK) {
        await rx.writeValueWithoutResponse(bytes.slice(i, i + CHUNK))
      }
    })
    this.writeChain = job.catch(() => {})
    return job
  }
}
