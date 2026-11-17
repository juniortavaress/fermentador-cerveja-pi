import { describe, expect, it } from "vitest"
import { convertPoints, deltaToUnit, fmtDelta, fmtTemp, fromUnit, toUnit } from "./units.js"

describe("unidades de temperatura", () => {
  it("converte °C <-> °F", () => {
    expect(toUnit(0, "F")).toBe(32)
    expect(toUnit(100, "F")).toBe(212)
    expect(toUnit(18, "C")).toBe(18)
    expect(fromUnit(64.4, "F")).toBeCloseTo(18, 5)
  })
  it("diferenças só escalam, sem somar 32", () => {
    expect(deltaToUnit(0.5, "F")).toBeCloseTo(0.9, 5)
    expect(fmtDelta(0.5, "F")).toBe("0,9")
    expect(fmtDelta(0.5, "C")).toBe("0,5")
  })
  it("formata com vírgula", () => {
    expect(fmtTemp(18.5, "C")).toBe("18,5")
    expect(fmtTemp(18.5, "F")).toBe("65,3")
  })
  it("converte pontos do histórico (e preserva em °C)", () => {
    const pts = [{ t: 1, actual: 10, setpoint: 10, ambient: 20 }]
    expect(convertPoints(pts, "C")).toBe(pts)
    expect(convertPoints(pts, "F")[0]).toEqual({ t: 1, actual: 50, setpoint: 50, ambient: 68 })
  })
})
