// USB Serial pelo navegador (Web Serial API: Chrome, Edge, Opera; não existe no Firefox/Safari).
// Funciona em localhost e em HTTPS (Vercel).
//
// Contrato de todo transporte (veja index.js):
//   kind, connect({auto}) -> Promise<boolean>, disconnect(), send(line),
//   onLine(cb) -> unsubscribe, onStatus(cb(status, detail)) -> unsubscribe
//   status: "disconnected" | "connecting" | "connected" | "error"

const BAUD_RATE = 115200

function getSerial() {
  if (typeof navigator === "undefined") return null
  return navigator.serial ?? null
}

export function isSerialSupported() {
  return getSerial() !== null
}

function describeError(e) {
  if (e?.name === "InvalidStateError" || /already open|Failed to open/i.test(e?.message ?? "")) {
    return "Porta ocupada. Feche outros programas que usam a placa (Monitor Serial, plotter) e tente de novo."
  }
  return e?.message ?? "Erro desconhecido ao abrir a porta."
}

export class SerialTransport {
  kind = "serial"

  port = null
  reader = null
  writer = null
  readableClosed = null
  loop = null
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

  /** `auto: true` tenta reaproveitar uma permissão já concedida, sem pedir ao usuário. */
  async connect(opts = {}) {
    const serial = getSerial()
    if (!serial) {
      this.emitStatus("error", "Este navegador não suporta USB Serial. Use Chrome ou Edge.")
      return false
    }

    if (!this.port) {
      if (opts.auto) {
        const ports = await serial.getPorts()
        if (ports.length === 0) return false
        this.port = ports[0]
      } else {
        try {
          this.port = await serial.requestPort()
        } catch {
          return false // o usuário fechou a janela de escolha da porta
        }
      }
    }

    this.emitStatus("connecting")
    try {
      await this.port.open({ baudRate: BAUD_RATE })
    } catch (e) {
      this.port = null
      this.emitStatus("error", describeError(e))
      return false
    }

    this.closing = false
    const decoder = new TextDecoderStream()
    this.readableClosed = this.port.readable.pipeTo(decoder.writable).catch(() => {})
    this.reader = decoder.readable.getReader()
    this.writer = this.port.writable.getWriter()
    this.emitStatus("connected")
    this.loop = this.readLoop()
    return true
  }

  async readLoop() {
    let buffer = ""
    try {
      for (;;) {
        const { value, done } = await this.reader.read()
        if (done) break
        buffer += value
        let idx
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (line) this.lineCbs.forEach((cb) => cb(line))
        }
      }
    } catch {
      /* cabo puxado ou erro de leitura: cai no cleanup */
    }
    await this.cleanup()
    this.emitStatus("disconnected", this.closing ? undefined : "Dispositivo desconectado.")
  }

  async cleanup() {
    try { this.reader?.releaseLock() } catch { /* ignore */ }
    try { this.writer?.releaseLock() } catch { /* ignore */ }
    try { await this.readableClosed } catch { /* ignore */ }
    try { await this.port?.close() } catch { /* ignore */ }
    this.reader = null
    this.writer = null
    this.readableClosed = null
    // Mantém this.port: reabrir não exige novo clique se a porta continuar presente.
  }

  async disconnect() {
    if (!this.reader) return
    this.closing = true
    try { await this.reader.cancel() } catch { /* ignore */ }
    await this.loop
  }

  async send(line) {
    if (!this.writer) throw new Error("Não conectado")
    await this.writer.write(new TextEncoder().encode(line + "\n"))
  }
}
