// @vitest-environment jsdom
// Teste de integração: o hook inteiro conversando com a placa virtual (simulador).
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFermenter } from "./useFermenter.js"

const HOUR = 3_600_000

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function setup() {
  const hook = renderHook(() => useFermenter())
  await advance(2000) // conecta e recebe as primeiras leituras
  return hook
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("conexão e leituras", () => {
  it("conecta ao simulador sozinho e recebe telemetria", async () => {
    const { result } = await setup()
    expect(result.current.status).toBe("connected")
    expect(result.current.telemetry).not.toBeNull()
    expect(result.current.telemetry.setpoint).toBe(18)
    expect(result.current.log.map((e) => e.event)).toContain("Dispositivo conectado")
  })

  it("guarda um ponto de histórico por minuto", async () => {
    const { result } = await setup()
    await advance(2 * 60_000)
    expect(result.current.history.length).toBeGreaterThanOrEqual(2)
    expect(result.current.history[0]).toHaveProperty("actual")
  })

  it("desconectar limpa a leitura e registra no log", async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.disconnect()
    })
    expect(result.current.status).toBe("disconnected")
    expect(result.current.telemetry).toBeNull()
    expect(result.current.log.map((e) => e.event)).toContain("Dispositivo desconectado")
  })
})

describe("fermentação: play / stop / etapas", () => {
  it("iniciar aplica o set point da primeira etapa na placa", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    expect(result.current.run).not.toBeNull()
    await advance(4000)
    expect(result.current.telemetry.setpoint).toBe(20) // etapa "Lag"
    expect(result.current.log.map((e) => e.event)).toContain("Fermentação iniciada")
  })

  it("não inicia sem conexão", async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.disconnect()
    })
    act(() => result.current.startBatch("exemplo-ipa"))
    expect(result.current.run).toBeNull()
  })

  it("só um lote roda por vez", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    act(() => result.current.startBatch("exemplo-pilsen"))
    expect(result.current.run.batchId).toBe("exemplo-ipa")
  })

  it("pular etapa avança e muda o set point", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    await advance(4000)
    act(() => result.current.skipCurrentStage())
    expect(result.current.run.stageIndex).toBe(1)
    await advance(4000)
    expect(result.current.telemetry.setpoint).toBe(18.5) // "Primária"
    expect(result.current.log.map((e) => e.event)).toContain("Etapa: Primária")
  })

  it("parar encerra a fermentação e a placa mantém o último set point", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    await advance(4000)
    act(() => result.current.stopBatch())
    expect(result.current.run).toBeNull()
    await advance(5000)
    expect(result.current.telemetry.setpoint).toBe(20)
    expect(result.current.log.map((e) => e.event)).toContain("Fermentação interrompida")
  })

  it("avança sozinho pelo relógio quando a etapa acaba", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    vi.setSystemTime(Date.now() + 13 * HOUR) // Lag dura 12 h
    await advance(1500)
    expect(result.current.run.stageIndex).toBe(1)
    await advance(4000)
    expect(result.current.telemetry.setpoint).toBe(18.5)
  })

  it("conclui o lote depois da última etapa", async () => {
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-ipa"))
    vi.setSystemTime(Date.now() + 500 * HOUR)
    await advance(1500)
    expect(result.current.run).toBeNull()
    expect(result.current.log.map((e) => e.event)).toContain("Fermentação concluída")
  })

  it("a fermentação sobrevive a recarregar a página (localStorage)", async () => {
    const first = await setup()
    act(() => first.result.current.startBatch("exemplo-ipa"))
    await advance(1000)
    first.unmount()

    const second = await setup()
    expect(second.result.current.run).not.toBeNull()
    expect(second.result.current.run.batchId).toBe("exemplo-ipa")
  })
})

describe("lotes", () => {
  it("cria, seleciona e apaga lotes; não apaga o que está rodando", async () => {
    const { result } = await setup()
    let created
    act(() => {
      created = result.current.createBatch({
        name: "Meu lote",
        style: "Stout",
        yeast: "Ale",
        stages: [{ name: "Única", durationHours: 24, temp: 19 }],
      })
    })
    expect(result.current.batches).toHaveLength(3)
    expect(result.current.selectedBatch.id).toBe(created.id)

    act(() => result.current.startBatch(created.id))
    act(() => result.current.deleteBatch(created.id)) // rodando: ignora
    expect(result.current.batches).toHaveLength(3)

    act(() => result.current.stopBatch())
    act(() => result.current.deleteBatch(created.id))
    expect(result.current.batches).toHaveLength(2)
  })

  it("set point manual só vale sem fermentação ativa", async () => {
    const { result } = await setup()
    act(() => result.current.setManualSetpoint(22))
    await advance(3000)
    expect(result.current.telemetry.setpoint).toBe(22)

    act(() => result.current.startBatch("exemplo-ipa"))
    act(() => result.current.setManualSetpoint(10)) // ignorado: a etapa manda
    await advance(4000)
    expect(result.current.telemetry.setpoint).toBe(20)
  })
})
