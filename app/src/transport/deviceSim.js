// Placa virtual: fala o mesmo protocolo e roda a mesma lógica de controle do firmware.
// Serve para desenvolver e testar o app sem hardware (Developer Mode).
import { controllerUpdate, initialControlState } from "../domain/controller.js"

const SP_RANGE = [0, 40]
const HYST_RANGE = [0.1, 5]
const MC_MAX = 30

export class DeviceSim {
  cfg = { setPoint: 18, hysteresis: 0.5, minCycleMs: 3 * 60_000 }
  state = initialControlState()
  enabled = false // como o firmware: começa em espera até receber RUN 1
  elapsedS = 0

  constructor(opts = {}) {
    this.chamber = opts.chamber ?? 22
    this.baseAmbient = opts.ambient ?? 24
  }

  get ambient() {
    return this.baseAmbient + 1.5 * Math.sin(this.elapsedS / 600)
  }

  /** Avança a física `dtS` segundos e roda o controle, como o loop() do firmware. */
  step(dtS, nowMs) {
    this.elapsedS += dtS
    const leak = (this.ambient - this.chamber) * 0.0008
    const heat = this.state.heating ? 0.012 : 0
    const cool = this.state.cooling ? 0.01 : 0
    this.chamber += dtS * (leak + heat - cool)
    this.state = this.enabled
      ? controllerUpdate(this.cfg, this.state, this.chamber, this.ambient, nowMs)
      : initialControlState()
  }

  telemetryLine() {
    const f = (n) => n.toFixed(1)
    return `SP:${f(this.cfg.setPoint)},Tcaixa:${f(this.chamber)},Tamb:${f(this.ambient)},Aquec:${this.state.heating ? 1 : 0},Frio:${this.state.cooling ? 1 : 0},Rntc_k:${f(10)},On:${this.enabled ? 1 : 0}`
  }

  configLine() {
    return `# Set point: ${this.cfg.setPoint.toFixed(1)} C | Histerese: ${this.cfg.hysteresis.toFixed(1)} C | Ciclo min: ${(this.cfg.minCycleMs / 60000).toFixed(1)} min`
  }

  /** Processa uma linha de comando e devolve as linhas de resposta. */
  handleLine(raw) {
    const line = raw.trim().toUpperCase()
    if (!line) return []
    if (line === "?") return [this.configLine()]

    const invalid = ["# Comando invalido. Use: SP 18.5 | H 0.5 | MC 3 | RUN 1 | ?"]
    const m = line.match(/^(SP|MC|RUN|H)\s*(-?[\d.]+)$/)
    if (!m) return invalid
    const v = parseFloat(m[2])
    if (Number.isNaN(v)) return invalid

    if (m[1] === "SP" && v >= SP_RANGE[0] && v <= SP_RANGE[1]) this.cfg.setPoint = v
    else if (m[1] === "H" && v >= HYST_RANGE[0] && v <= HYST_RANGE[1]) this.cfg.hysteresis = v
    else if (m[1] === "RUN" && (v === 0 || v === 1)) {
      this.enabled = v === 1
      if (!this.enabled) this.state = initialControlState()
      return [this.enabled ? "# Controle: ligado" : "# Controle: em espera"]
    } else if (m[1] === "MC" && v >= 0 && v <= MC_MAX) this.cfg.minCycleMs = v * 60_000
    else return invalid
    return [this.configLine()]
  }
}
