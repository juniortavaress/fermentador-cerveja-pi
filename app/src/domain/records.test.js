import { describe, expect, it } from "vitest"
import { addPoint, finishRecord, newRecord, noteStage, stageSummaries, summarize, RECORD_POINTS_MAX } from "./records.js"

const batch = {
  id: "b",
  name: "Lote",
  stages: [
    { name: "A", temp: 20, durationHours: 1 },
    { name: "B", temp: 10, durationHours: 1 },
  ],
}
const pt = (t, actual) => ({ t, actual, setpoint: 20, ambient: 25 })

describe("registro de fermentação", () => {
  it("começa em andamento com a receita copiada e o 1º horário de etapa", () => {
    const r = newRecord(batch, 1000, 0.5)
    expect(r).toMatchObject({ id: "run-1000", batchId: "b", name: "Lote", status: "running", endedAt: null, hysteresis: 0.5 })
    expect(r.stageStarts).toEqual([1000])
    expect(r.stages.map((s) => s.name)).toEqual(["A", "B"])
  })

  it("a cópia da receita não muda se o lote for editado depois", () => {
    const r = newRecord(batch, 0, 0.5)
    batch.stages[0].temp = 99
    expect(r.stages[0].temp).toBe(20)
    batch.stages[0].temp = 20
  })

  it("guarda pontos arredondados a 0,1 °C", () => {
    let r = newRecord(batch, 0, 0.5)
    r = addPoint(r, pt(1000, 19.4567))
    expect(r.points[0].actual).toBe(19.5)
  })

  it("resume por etapa: alvo, duração e mín/máx/média", () => {
    let r = newRecord(batch, 0, 0.5)
    for (let s = 0; s < 20; s++) {
      if (s === 10) r = noteStage(r, s * 1000)
      r = addPoint(r, pt(s * 1000, s < 10 ? 20 + (s % 2) : 10 - (s % 2)))
    }
    r = finishRecord(r, "finished", 20_000)
    const [a, b] = stageSummaries(r)
    expect(a).toMatchObject({ name: "A", temp: 20, ms: 10_000 })
    expect(a.stats.min).toBe(20)
    expect(a.stats.max).toBe(21)
    expect(b).toMatchObject({ name: "B", temp: 10, ms: 10_000 })
    expect(b.stats.max).toBe(10)
    expect(b.stats.min).toBe(9)
  })

  it("fechar enxuga os pontos mantendo o último", () => {
    let r = newRecord(batch, 0, 0.5)
    for (let s = 0; s < 5000; s++) r = { ...r, points: [...r.points, pt(s * 1000, 20)] }
    r = finishRecord(r, "stopped", 5_000_000)
    expect(r.points.length).toBeLessThanOrEqual(RECORD_POINTS_MAX + 1)
    expect(r.points.at(-1).t).toBe(4_999_000)
    expect(r.status).toBe("stopped")
  })

  it("summarize de lista vazia é null", () => {
    expect(summarize([])).toBeNull()
  })
})
