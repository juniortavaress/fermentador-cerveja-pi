import { DeviceSim } from "./deviceSim.js"
import { SIM_LIMITS, getSimControl, setSimControl } from "./simControl.js"

/** Transporte que conversa com a placa virtual (Modo dev). Mesmo contrato do SerialTransport. */
export class SimulatorTransport {
  kind = "simulator"

  sim = new DeviceSim({ manual: true }) // câmara = potenciômetro da tela; ambiente fixo, definido na tela
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

  autoTicks = 0

  /**
   * Lê o potenciômetro e o NTC do circuito simulado.
   * No modo automático, move os dois sozinhos: a câmara persegue o alvo da etapa (rápido, para dar para ver
   * na demonstração) e o ambiente oscila em volta de 26 °C. A tela acompanha, porque tudo passa pelo store.
   */
  readCircuit() {
    let c = getSimControl()
    if (c.auto) {
      this.autoTicks += 1
      const target = this.sim.enabled ? this.sim.cfg.setPoint : c.ambient // em espera, a câmara vai para o ambiente
      const jitter = (Math.random() - 0.5) * 0.1
      const chamber = Math.min(SIM_LIMITS.chamber.max, Math.max(SIM_LIMITS.chamber.min, c.chamber + (target - c.chamber) * 0.22 + jitter))
      setSimControl({ chamber, ambient: 26 + 1.5 * Math.sin(this.autoTicks / 15) })
      c = getSimControl()
    }
    this.sim.chamber = c.chamber
    this.sim.baseAmbient = c.ambient
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
      this.readCircuit()
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
