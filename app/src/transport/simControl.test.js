// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SimulatorTransport } from "./simulator.js"
import { DeviceSim } from "./deviceSim.js"
import { SIM_LIMITS, getSimControl, resetSimControl, setSimControl, subscribeSimControl } from "./simControl.js"

beforeEach(() => resetSimControl())

describe("controles do circuito simulado", () => {
  it("guarda o potenciômetro e o ambiente dentro das faixas do circuito", () => {
    setSimControl({ chamber: 12.34, ambient: 31 })
    expect(getSimControl()).toMatchObject({ chamber: 12.3, ambient: 31, auto: false })
    setSimControl({ chamber: 99 })
    expect(getSimControl().chamber).toBe(SIM_LIMITS.chamber.max) // pot do firmware vai até 35 °C
    setSimControl({ ambient: -5 })
    expect(getSimControl().ambient).toBe(SIM_LIMITS.ambient.min)
  })

  it("avisa quem está ouvindo só quando algo muda", () => {
    const cb = vi.fn()
    const off = subscribeSimControl(cb)
    setSimControl({ chamber: 10 })
    setSimControl({ chamber: 10 }) // igual: nada
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    setSimControl({ chamber: 11 })
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

describe("placa virtual em modo manual (como o circuito real)", () => {
  it("a câmara vale exatamente o que o pot mostra e o ambiente não oscila", () => {
    const sim = new DeviceSim({ manual: true, chamber: 10, ambient: 28 })
    sim.enabled = true
    sim.cfg.setPoint = 18
    for (let i = 0; i < 600; i++) sim.step(1, i * 1000)
    expect(sim.chamber).toBe(10) // as saídas não esquentam nem esfriam a câmara: quem manda é o pot
    expect(sim.ambient).toBe(28) // ambiente fixo, sem a oscilação do modo antigo
  })

  it("liga a resistência com a câmara abaixo do alvo e o resfriador com o ambiente acima", () => {
    const sim = new DeviceSim({ manual: true, chamber: 10, ambient: 28 })
    sim.enabled = true
    sim.cfg.setPoint = 18
    sim.step(1, 1000)
    expect(sim.state.heating).toBe(true) // 10 < 18 - 0,5
    expect(sim.state.cooling).toBe(true) // 28 > 18 + 0,5
    sim.baseAmbient = 15 // ambiente abaixo do alvo: resfriador desliga
    sim.cfg.minCycleMs = 0
    sim.step(1, 2000)
    expect(sim.state.cooling).toBe(false)
  })

  it("o transporte do Modo dev lê o circuito a cada segundo", async () => {
    vi.useFakeTimers()
    setSimControl({ chamber: 9.5, ambient: 30 })
    const t = new SimulatorTransport()
    const lines = []
    t.onLine((l) => lines.push(l))
    await t.connect()
    await vi.advanceTimersByTimeAsync(1100)
    expect(lines.some((l) => l.includes("Tcaixa:9.5") && l.includes("Tamb:30.0"))).toBe(true)
    setSimControl({ chamber: 14 }) // girou o pot
    lines.length = 0
    await vi.advanceTimersByTimeAsync(1100)
    expect(lines.some((l) => l.includes("Tcaixa:14.0"))).toBe(true)
    await t.disconnect()
    vi.useRealTimers()
  })
})

describe("simulação automática", () => {
  const start = async () => {
    const t = new SimulatorTransport()
    const lines = []
    t.onLine((l) => lines.push(l))
    await t.connect()
    return { t, lines }
  }
  const last = (lines, key) => Number(lines.filter((l) => l.startsWith("SP:")).at(-1).match(new RegExp(`${key}:(-?[\\d.]+)`))[1])

  it("a câmara persegue o alvo da etapa e o ambiente oscila sozinho", async () => {
    vi.useFakeTimers()
    setSimControl({ chamber: 10, ambient: 26, auto: true })
    const { t, lines } = await start()
    await t.send("RUN 1")
    await t.send("SP 30")
    await vi.advanceTimersByTimeAsync(40_000)
    expect(last(lines, "Tcaixa")).toBeGreaterThan(29) // subiu de 10 para perto de 30
    expect(last(lines, "Tcaixa")).toBeLessThanOrEqual(35)
    const ambients = lines.filter((l) => l.startsWith("SP:")).map((l) => Number(l.match(/Tamb:(-?[\d.]+)/)[1]))
    expect(Math.max(...ambients) - Math.min(...ambients)).toBeGreaterThan(1) // oscila
    expect(Math.min(...ambients)).toBeGreaterThan(23)
    expect(Math.max(...ambients)).toBeLessThan(29)

    await t.send("SP 8") // próxima etapa mais fria
    await vi.advanceTimersByTimeAsync(40_000)
    expect(last(lines, "Tcaixa")).toBeLessThan(9.5)
    await t.disconnect()
    vi.useRealTimers()
  })

  it("em espera, a câmara vai para o ambiente", async () => {
    vi.useFakeTimers()
    setSimControl({ chamber: 5, ambient: 26, auto: true })
    const { t, lines } = await start() // placa começa em espera
    await vi.advanceTimersByTimeAsync(40_000)
    expect(last(lines, "Tcaixa")).toBeGreaterThan(22)
    await t.disconnect()
    vi.useRealTimers()
  })

  it("sem o modo automático, a câmara não se mexe sozinha", async () => {
    vi.useFakeTimers()
    setSimControl({ chamber: 12, ambient: 26, auto: false })
    const { t, lines } = await start()
    await t.send("RUN 1")
    await t.send("SP 30")
    await vi.advanceTimersByTimeAsync(20_000)
    expect(last(lines, "Tcaixa")).toBe(12)
    await t.disconnect()
    vi.useRealTimers()
  })
})
