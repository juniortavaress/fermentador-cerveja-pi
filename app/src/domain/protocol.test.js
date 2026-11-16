import { describe, expect, it } from "vitest"
import { encodeCommand, parseLine } from "./protocol.js"

describe("parseLine", () => {
  it("lê a telemetria completa da placa", () => {
    expect(parseLine("SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8")).toEqual({
      kind: "telemetry",
      setpoint: 18,
      chamber: 17.4,
      ambient: 27.9,
      heating: true,
      cooling: false,
    })
  })

  it("trata NTC solto (Rntc_k <= 0) como ambiente ausente", () => {
    const m = parseLine("SP:18.0,Tcaixa:9.4,Tamb:0,Aquec:1,Frio:0,Rntc_k:-0.0")
    expect(m.kind).toBe("telemetry")
    expect(m.ambient).toBeNull()
  })

  it("lê a configuração, com e sem ciclo mínimo", () => {
    expect(parseLine("# Set point: 15.0 C | Histerese: 2.0 C | Ciclo min: 3.0 min")).toEqual({
      kind: "config",
      config: { setpoint: 15, hysteresis: 2, minCycleMin: 3 },
    })
    expect(parseLine("# Set point: 18.0 C | Histerese: 0.5 C").config.minCycleMin).toBeNull()
  })

  it("mensagens de texto viram info", () => {
    expect(parseLine("# Fermentador iniciado")).toEqual({ kind: "info", text: "Fermentador iniciado" })
  })

  it("ignora linhas vazias, cortadas ou sem os campos obrigatórios", () => {
    expect(parseLine("")).toBeNull()
    expect(parseLine("   ")).toBeNull()
    expect(parseLine("SP:18.0,Tcaix")).toBeNull()
    expect(parseLine("lixo qualquer")).toBeNull()
    expect(parseLine("Tamb:20.0,Aquec:1")).toBeNull()
  })
})

describe("encodeCommand", () => {
  it("gera os comandos que o firmware entende", () => {
    expect(encodeCommand({ type: "sp", value: 18.5 })).toBe("SP 18.5")
    expect(encodeCommand({ type: "hyst", value: 2 })).toBe("H 2.0")
    expect(encodeCommand({ type: "minCycle", value: 3 })).toBe("MC 3.0")
    expect(encodeCommand({ type: "getConfig" })).toBe("?")
  })
})
