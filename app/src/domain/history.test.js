import { describe, expect, it } from "vitest"
import { appendHistory } from "./history.js"

const OPTS = { fineMs: 10_000, coarseMs: 60_000, maxMs: 600_000 }
const pt = (t) => ({ t, actual: 1 })

describe("appendHistory", () => {
  it("mantém todos os pontos da janela recente (um por segundo)", () => {
    let h = []
    for (let s = 0; s <= 8; s++) h = appendHistory(h, pt(1_000_000 + s * 1000), OPTS)
    expect(h).toHaveLength(9)
  })

  it("o que é mais antigo que a janela recente vira um ponto por minuto", () => {
    let h = []
    for (let s = 0; s <= 300; s++) h = appendHistory(h, pt(6_000_000 + s * 1000), OPTS) // 5 min a 1 Hz
    const old = h.filter((p) => 6_300_000 - p.t > OPTS.fineMs)
    const recent = h.filter((p) => 6_300_000 - p.t <= OPTS.fineMs)
    expect(recent).toHaveLength(11)
    expect(old.length).toBeLessThanOrEqual(6)
    // um por minuto: nunca dois no mesmo minuto
    const minutes = old.map((p) => Math.floor(p.t / 60_000))
    expect(new Set(minutes).size).toBe(minutes.length)
  })

  it("descarta o que passou do limite", () => {
    const h = appendHistory([pt(0), pt(1000)], pt(700_000), OPTS)
    expect(h.map((p) => p.t)).toEqual([700_000])
  })

  it("não deixa crescer sem limite em um dia de leituras", () => {
    let h = []
    const start = 10_000_000
    for (let s = 0; s < 3 * 3600; s += 1) h = appendHistory(h, pt(start + s * 1000), { fineMs: 3_600_000, coarseMs: 60_000, maxMs: 72 * 3_600_000 })
    expect(h.length).toBeLessThan(3600 + 130)
  })
})
