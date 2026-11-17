import { describe, expect, it } from "vitest"
import { parseLine } from "../domain/protocol.js"
import { DeviceSim } from "./deviceSim.js"

describe("lógica de controle (mesma do firmware)", () => {
  it("SP abaixo do ambiente liga o arrefecimento direto", () => {
    const sim = new DeviceSim({ chamber: 20, ambient: 25 })
    sim.enabled = true
    sim.handleLine("SP 15")
    sim.step(1, 10_000)
    expect(sim.state.cooling).toBe(true)
  })

  it("SP acima do ambiente mantém o arrefecimento desligado", () => {
    const sim = new DeviceSim({ chamber: 20, ambient: 22 })
    sim.enabled = true
    sim.handleLine("SP 28")
    sim.step(1, 10_000)
    expect(sim.state.cooling).toBe(false)
  })

  it("resistência liga abaixo de SP - delta T e só desliga ao chegar no SP", () => {
    const sim = new DeviceSim({ chamber: 12, ambient: 25 })
    sim.enabled = true
    sim.handleLine("SP 15")
    sim.handleLine("H 2")
    sim.step(1, 10_000)
    expect(sim.state.heating).toBe(true) // 12 < 13

    sim.chamber = 14 // entre 13 e 15: mantém ligada (histerese)
    sim.step(0, 11_000)
    expect(sim.state.heating).toBe(true)

    sim.chamber = 15.1
    sim.step(0, 12_000)
    expect(sim.state.heating).toBe(false)
  })

  it("respeita o ciclo mínimo do arrefecimento", () => {
    const sim = new DeviceSim({ chamber: 20, ambient: 25 })
    sim.enabled = true
    sim.handleLine("SP 15")
    sim.handleLine("MC 3")
    sim.step(0, 0)
    expect(sim.state.cooling).toBe(true)

    sim.handleLine("SP 30") // agora o arrefecimento deveria desligar...
    sim.step(0, 60_000) // ...mas só passou 1 min
    expect(sim.state.cooling).toBe(true)
    sim.step(0, 181_000) // 3 min depois
    expect(sim.state.cooling).toBe(false)
  })

  it("responde a comandos no mesmo protocolo da placa", () => {
    const sim = new DeviceSim()
    const [reply] = sim.handleLine("SP 21.5")
    expect(parseLine(reply)).toEqual({
      kind: "config",
      config: { setpoint: 21.5, hysteresis: 0.5, minCycleMin: 3 },
    })
    expect(sim.handleLine("SP 99")[0]).toMatch(/invalido/)
    expect(sim.handleLine("H 0")[0]).toMatch(/invalido/)
    expect(sim.handleLine("banana")[0]).toMatch(/invalido/)
  })

  it("a telemetria gerada é lida pelo parser do app", () => {
    const sim = new DeviceSim()
    sim.step(1, 1000)
    const m = parseLine(sim.telemetryLine())
    expect(m.kind).toBe("telemetry")
    expect(m.setpoint).toBe(18)
  })
})

describe("espera (standby)", () => {
  it("começa em espera: nada liga, mesmo com SP bem abaixo do ambiente", () => {
    const sim = new DeviceSim({ chamber: 20, ambient: 25 })
    sim.cfg.setPoint = 10
    for (let i = 0; i < 20; i++) sim.step(1, i * 1000)
    expect(sim.state.cooling).toBe(false)
    expect(sim.state.heating).toBe(false)
    expect(sim.telemetryLine()).toContain("On:0")
  })

  it("RUN 1 liga o controle e RUN 0 desliga as saídas na hora", () => {
    const sim = new DeviceSim({ chamber: 20, ambient: 25 })
    sim.cfg.setPoint = 10
    sim.handleLine("RUN 1")
    sim.step(1, 1000)
    expect(sim.state.cooling).toBe(true)
    expect(sim.telemetryLine()).toContain("On:1")
    sim.handleLine("RUN 0")
    expect(sim.state.cooling).toBe(false)
    expect(sim.telemetryLine()).toContain("On:0")
  })
})
