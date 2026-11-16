import { DeviceSim } from "./deviceSim.js"

/** Transporte que conversa com a placa virtual (Developer Mode). Mesmo contrato do SerialTransport. */
export class SimulatorTransport {
  kind = "simulator"

  sim = new DeviceSim()
  timer = null
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

  emit(line) {
    this.lineCbs.forEach((cb) => cb(line))
  }

  async connect() {
    if (this.timer) return true
    this.statusCbs.forEach((cb) => cb("connected"))
    setTimeout(() => {
      this.emit("# Fermentador iniciado (simulador)")
      this.emit(this.sim.configLine())
    }, 200)
    this.timer = setInterval(() => {
      this.sim.step(1, Date.now())
      this.emit(this.sim.telemetryLine())
    }, 1000)
    return true
  }

  async disconnect() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.statusCbs.forEach((cb) => cb("disconnected"))
  }

  async send(line) {
    if (!this.timer) throw new Error("Não conectado")
    for (const reply of this.sim.handleLine(line)) this.emit(reply)
  }
}
