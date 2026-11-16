import { describe, expect, it } from "vitest"
import { downsample, sliceRange, stats } from "./chart.js"

const pts = (n) => Array.from({ length: n }, (_, i) => ({ t: i * 1000, actual: i, setpoint: 18, ambient: null }))

describe("helpers de gráfico", () => {
  it("recorta pela janela de tempo", () => {
    expect(sliceRange(pts(10), 9000, 3000).map((p) => p.t)).toEqual([6000, 7000, 8000, 9000])
    expect(sliceRange(pts(10), 9000, null)).toHaveLength(10)
  })

  it("reduz pontos mantendo o último", () => {
    const out = downsample(pts(1000), 100)
    expect(out.length).toBeLessThanOrEqual(110)
    expect(out.at(-1).t).toBe(999_000)
    expect(downsample(pts(50), 100)).toHaveLength(50)
  })

  it("calcula mínimo, máximo e média", () => {
    expect(stats(pts(5))).toEqual({ min: 0, max: 4, avg: 2 })
    expect(stats([])).toBeNull()
  })
})
