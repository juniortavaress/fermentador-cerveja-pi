import { describe, expect, it } from "vitest"
import {
  HOUR_MS,
  advanceRun,
  deviationOnSetpointChange,
  evaluateDeviation,
  initialDeviation,
  runSetpoint,
  skipStage,
  stageFraction,
  stageRemainingMs,
  startRun,
  totalHours,
} from "./engine.js"

const batch = {
  id: "b1",
  name: "Teste",
  style: "IPA",
  yeast: "Ale",
  stages: [
    { name: "Lag", durationHours: 12, temp: 20 },
    { name: "Primária", durationHours: 72, temp: 18.5 },
    { name: "Maturação", durationHours: 96, temp: 4 },
  ],
}
const T0 = 1_000_000_000_000

describe("fermentação por etapas", () => {
  it("começa na etapa 1 com o set point dela", () => {
    const run = startRun(batch, T0)
    expect(run.stageIndex).toBe(0)
    expect(runSetpoint(run, batch)).toBe(20)
    expect(totalHours(batch)).toBe(180)
  })

  it("não avança antes de a etapa acabar", () => {
    const run = startRun(batch, T0)
    const { run: next, events } = advanceRun(run, batch, T0 + 12 * HOUR_MS - 1)
    expect(next).toEqual(run)
    expect(events).toEqual([])
  })

  it("avança quando a duração da etapa se esgota", () => {
    const run = startRun(batch, T0)
    const { run: next, events } = advanceRun(run, batch, T0 + 12 * HOUR_MS)
    expect(next.stageIndex).toBe(1)
    expect(next.stageStartedAt).toBe(T0 + 12 * HOUR_MS)
    expect(events).toEqual([{ type: "stage", fromIndex: 0, toIndex: 1, at: T0 + 12 * HOUR_MS }])
    expect(runSetpoint(next, batch)).toBe(18.5)
  })

  it("recupera várias etapas se a página ficou fechada, mantendo a linha do tempo", () => {
    const run = startRun(batch, T0)
    const { run: next, events } = advanceRun(run, batch, T0 + 100 * HOUR_MS)
    expect(next.stageIndex).toBe(2)
    expect(next.stageStartedAt).toBe(T0 + 84 * HOUR_MS) // 12 + 72
    expect(events.map((e) => e.type)).toEqual(["stage", "stage"])
  })

  it("termina depois da última etapa", () => {
    const run = startRun(batch, T0)
    const { run: next, events } = advanceRun(run, batch, T0 + 500 * HOUR_MS)
    expect(next).toBeNull()
    expect(events.at(-1)).toEqual({ type: "finished", at: T0 + 180 * HOUR_MS })
  })

  it("pular etapa avança agora e, na última, encerra", () => {
    const run = startRun(batch, T0)
    const skipped = skipStage(run, batch, T0 + HOUR_MS)
    expect(skipped.run.stageIndex).toBe(1)
    expect(skipped.run.stageStartedAt).toBe(T0 + HOUR_MS)

    const last = { ...run, stageIndex: 2 }
    expect(skipStage(last, batch, T0).run).toBeNull()
  })

  it("calcula tempo restante e fração da etapa", () => {
    const run = startRun(batch, T0)
    expect(stageRemainingMs(run, batch, T0 + 2 * HOUR_MS)).toBe(10 * HOUR_MS)
    expect(stageFraction(run, batch, T0 + 6 * HOUR_MS)).toBeCloseTo(0.5)
    expect(stageFraction(run, batch, T0 + 99 * HOUR_MS)).toBe(1)
  })
})

describe("alerta de desvio", () => {
  it("dispara uma vez ao passar do limite e uma vez ao voltar", () => {
    let s = initialDeviation
    let r = evaluateDeviation(s, 0.3, 1000, 0.5)
    expect(r.event).toBeNull()

    r = evaluateDeviation(r.state, 0.8, 2000, 0.5)
    expect(r.event).toBe("start")
    s = r.state

    r = evaluateDeviation(s, 0.9, 3000, 0.5) // continua fora: sem repetir
    expect(r.event).toBeNull()

    r = evaluateDeviation(r.state, 0.4, 4000, 0.5) // ainda acima da metade do limite
    expect(r.event).toBeNull()

    r = evaluateDeviation(r.state, 0.2, 5000, 0.5)
    expect(r.event).toBe("end")
  })

  it("não alerta durante a carência depois de trocar o set point", () => {
    const s = deviationOnSetpointChange(initialDeviation, 1000, 30 * 60_000)
    expect(evaluateDeviation(s, 2, 1000 + 10 * 60_000, 0.5).event).toBeNull()
    expect(evaluateDeviation(s, 2, 1000 + 31 * 60_000, 0.5).event).toBe("start")
  })
})
