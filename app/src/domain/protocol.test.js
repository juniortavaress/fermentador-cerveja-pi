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
      active: true, // firmware antigo, sem o campo On, conta como ligado
    })
  })

  it("lê o campo On: 0 = placa em espera, 1 = controlando", () => {
    expect(parseLine("SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:0,Frio:0,Rntc_k:8.8,On:0").active).toBe(false)
    expect(parseLine("SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:0,Frio:1,Rntc_k:8.8,On:1").active).toBe(true)
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

describe("encodeCommand run", () => {
  it("liga e desliga o controle", () => {
    expect(encodeCommand({ type: "run", value: true })).toBe("RUN 1")
    expect(encodeCommand({ type: "run", value: false })).toBe("RUN 0")
  })
})
