// @vitest-environment jsdom
// Teste de integração: o hook inteiro conversando com a placa virtual (simulador).
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFermenter } from "./useFermenter.js"
import { SimulatorTransport } from "../transport/simulator.js"
import { LONG_BATCHES as LONG_BATCHES_FOR_MIGRATION, seedLongBatches } from "./testFixtures.js"
import { DEMO_BATCH, SAMPLE_BATCHES } from "./defaults.js"

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
  seedLongBatches()
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

  it("guarda um ponto de histórico por segundo", async () => {
    const { result } = await setup()
    await advance(10_000)
    expect(result.current.history.length).toBeGreaterThanOrEqual(10)
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

describe("ajuste fino por lote", () => {
  it("a placa recebe a tolerância do lote ao dar o play, e volta ao padrão ao parar", async () => {
    const sent = []
    const orig = SimulatorTransport.prototype.send
    vi.spyOn(SimulatorTransport.prototype, "send").mockImplementation(function (line) {
      sent.push(line.trim())
      return orig.call(this, line)
    })
    const { result } = await setup()
    act(() => result.current.createBatch({
      name: "Fino", style: "x", yeast: "y", hysteresis: 1.5,
      stages: [{ name: "Única", durationHours: 10, temp: 15 }],
    }))
    const id = result.current.batches.at(-1).id

    sent.length = 0
    act(() => result.current.startBatch(id))
    await advance(1000)
    expect(sent).toContain("H 1.5")

    // mudar o ajuste com a fermentação rodando chega à placa
    sent.length = 0
    act(() => result.current.updateBatch(id, { hysteresis: 2 }))
    await advance(1000)
    expect(sent).toContain("H 2.0")

    // parar: volta ao padrão geral (0,5 / 3 min)
    sent.length = 0
    act(() => result.current.stopBatch())
    await advance(1000)
    expect(sent).toContain("H 0.5")
    expect(sent).toContain("MC 3.0")
    vi.restoreAllMocks()
  })
})

describe("espera sem fermentação", () => {
  it("a placa fica em espera sem fermentação, liga ao dar o play e desliga ao parar", async () => {
    const { result } = await setup()
    await advance(3000)
    expect(result.current.telemetry.active).toBe(false) // sem fermentação: espera
    expect(result.current.telemetry.cooling).toBe(false)
    expect(result.current.telemetry.heating).toBe(false)

    act(() => result.current.startBatch("exemplo-ipa"))
    await advance(4000)
    expect(result.current.telemetry.active).toBe(true)

    act(() => result.current.stopBatch())
    await advance(4000)
    expect(result.current.telemetry.active).toBe(false)
    expect(result.current.telemetry.cooling).toBe(false)
  })
})

describe("exemplo de demonstração", () => {
  it("o exemplo tem 5 etapas de temperaturas bem diferentes: 4 de 15 s e a última de 1 min", () => {
    const secs = DEMO_BATCH.stages.map((s) => Math.round(s.durationHours * 3600))
    expect(secs).toEqual([15, 15, 15, 15, 60])
    const temps = DEMO_BATCH.stages.map((s) => s.temp)
    expect(new Set(temps).size).toBe(5)
    const sorted = [...temps].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(4) // variação bem visível
    expect(Math.min(...temps)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...temps)).toBeGreaterThan(30) // etapa acima do ambiente: o resfriador desliga
    expect(Math.max(...temps)).toBeLessThanOrEqual(40) // limite da placa
    expect(DEMO_BATCH.minCycleMin).toBe(0)
  })

  it("instalação nova já vem só com o exemplo de demonstração", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    expect(result.current.batches.map((b) => b.id)).toEqual(["exemplo-apa", ...SAMPLE_BATCHES.map((b) => b.id)])
    expect(result.current.selectedBatch.id).toBe("exemplo-apa")
  })

  it("quem já tinha os exemplos antigos fica só com o novo (e os lotes próprios continuam)", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const meu = { id: "meu", name: "Meu lote", style: "x", yeast: "y", stages: [{ name: "A", durationHours: 1, temp: 18 }] }
    localStorage.setItem("fermentador.batches", JSON.stringify([...LONG_BATCHES_FOR_MIGRATION, meu]))
    localStorage.setItem("fermentador.selected", JSON.stringify("exemplo-ipa"))
    const { result } = await setup()
    const ids = result.current.batches.map((b) => b.id)
    expect(ids).toContain("exemplo-apa")
    expect(ids).toContain("meu")
    expect(ids).not.toContain("exemplo-ipa")
    expect(ids).not.toContain("exemplo-pilsen")
    expect(ids).toContain("base-pilsen") // e ganhou as receitas prontas
    expect(result.current.selectedBatch.id).toBe("exemplo-apa")
  })

  it("quem tinha o lote salvo como \"Exemplo · American Pale Ale\" passa a ver só \"American Pale Ale\"", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    localStorage.setItem("fermentador.seed", "3") // mesmo já migrado, o nome é corrigido
    localStorage.setItem("fermentador.batches", JSON.stringify([{ ...DEMO_BATCH, name: "Exemplo · American Pale Ale" }]))
    const { result } = await setup()
    expect(result.current.batches[0].name).toBe("American Pale Ale")
    expect(result.current.batches.some((b) => /^exemplo/i.test(b.name))).toBe(false)
  })

  it("a demonstração roda sozinha pelas 5 etapas e termina em 2 min", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-apa"))
    const seen = []
    for (let i = 0; i < 125; i++) {
      await advance(1000)
      if (result.current.run) seen.push(result.current.run.stageIndex)
    }
    expect([...new Set(seen)]).toEqual([0, 1, 2, 3, 4])
    expect(result.current.run).toBeNull()
    expect(result.current.log.map((e) => e.event)).toContain("Fermentação concluída")
  })
})

describe("demonstração: resfriador sem pausa mínima", () => {
  it("a placa recebe MC 0 ao iniciar a demonstração e volta ao padrão (3 min) ao parar", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const sent = []
    const orig = SimulatorTransport.prototype.send
    vi.spyOn(SimulatorTransport.prototype, "send").mockImplementation(function (line) {
      sent.push(line.trim())
      return orig.call(this, line)
    })
    const { result } = await setup()
    sent.length = 0
    act(() => result.current.startBatch("exemplo-apa"))
    await advance(1500)
    expect(sent).toContain("MC 0.0")
    sent.length = 0
    act(() => result.current.stopBatch())
    await advance(1500)
    expect(sent).toContain("MC 3.0")
    vi.restoreAllMocks()
  })

  it("quem já tinha o lote antigo recebe a receita nova (31 °C, sem pausa) mantendo a tolerância escolhida", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    localStorage.setItem("fermentador.seed", "3")
    const old = { ...DEMO_BATCH, minCycleMin: undefined, hysteresis: 1, stages: DEMO_BATCH.stages.map((s) => ({ ...s, temp: 28 })) }
    localStorage.setItem("fermentador.batches", JSON.stringify([old]))
    const { result } = await setup()
    const demo = result.current.batches[0]
    expect(demo.stages[2].temp).toBe(31)
    expect(demo.minCycleMin).toBe(0)
    expect(demo.hysteresis).toBe(1)
  })
})

describe("histórico de fermentações", () => {
  async function runDemoToEnd() {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const hook = await setup()
    act(() => hook.result.current.startBatch("exemplo-apa"))
    for (let i = 0; i < 125; i++) await advance(1000)
    return hook
  }

  it("ao concluir, guarda o registro com curva, etapas e resultado", async () => {
    const { result } = await runDemoToEnd()
    expect(result.current.run).toBeNull()
    expect(result.current.activeRecord).toBeNull()
    expect(result.current.records).toHaveLength(1)
    const rec = result.current.records[0]
    expect(rec).toMatchObject({ batchId: "exemplo-apa", name: "American Pale Ale", status: "finished" })
    expect(rec.stages.map((s) => s.temp)).toEqual([24, 16, 31, 8, 20])
    expect(rec.stageStarts).toHaveLength(5)
    expect(rec.endedAt).toBeGreaterThan(rec.startedAt)
    expect(rec.points.length).toBeGreaterThan(100) // um ponto por segundo durante ~2 min
    // os alvos da placa mudaram junto com as etapas
    expect(new Set(rec.points.map((p) => p.setpoint)).size).toBeGreaterThanOrEqual(4)
  })

  it("enquanto roda, o registro vai crescendo; parar o fecha como interrompido", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-apa"))
    await advance(20_000)
    expect(result.current.activeRecord.status).toBe("running")
    expect(result.current.activeRecord.points.length).toBeGreaterThan(10)
    expect(result.current.activeRecord.stageStarts.length).toBeGreaterThanOrEqual(2) // já passou pela 1ª etapa (15 s)
    act(() => result.current.stopBatch())
    expect(result.current.activeRecord).toBeNull()
    expect(result.current.records.at(-1).status).toBe("stopped")
  })

  it("pular até o fim fecha como concluída", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-apa"))
    for (let i = 0; i < 5; i++) {
      await advance(1100)
      act(() => result.current.skipCurrentStage())
    }
    expect(result.current.run).toBeNull()
    expect(result.current.records.at(-1).status).toBe("finished")
  })

  it("guarda só as últimas 10 e permite apagar um registro", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    for (let i = 0; i < 12; i++) {
      act(() => result.current.startBatch("exemplo-apa"))
      await advance(1100)
      act(() => result.current.stopBatch())
    }
    expect(result.current.records).toHaveLength(10)
    const id = result.current.records[0].id
    act(() => result.current.deleteRecord(id))
    expect(result.current.records).toHaveLength(9)
    expect(result.current.records.some((r) => r.id === id)).toBe(false)
  })

  it("o registro sobrevive a recarregar a página", async () => {
    const first = await runDemoToEnd()
    first.unmount()
    const second = renderHook(() => useFermenter())
    await advance(100)
    expect(second.result.current.records).toHaveLength(1)
    expect(second.result.current.records[0].points.length).toBeGreaterThan(100)
  })
})

describe("receitas prontas", () => {
  it("são lotes de estilos reais, com etapas válidas e temperaturas aceitas pela placa", () => {
    expect(SAMPLE_BATCHES.map((b) => b.name)).toEqual(["American IPA", "Pilsen", "Weissbier", "Dry Stout", "Belgian Tripel", "Saison"])
    const ids = SAMPLE_BATCHES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of SAMPLE_BATCHES) {
      expect(b.name).not.toMatch(/exemplo/i)
      expect(b.stages.length).toBeGreaterThanOrEqual(2)
      for (const s of b.stages) {
        expect(s.name).toBeTruthy()
        expect(s.durationHours).toBeGreaterThan(0)
        expect(s.temp).toBeGreaterThanOrEqual(0)
        expect(s.temp).toBeLessThanOrEqual(40) // limite da placa
      }
    }
  })

  it("quem já tem lotes recebe as receitas prontas uma vez; o que apagar depois não volta", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    localStorage.setItem("fermentador.seed", "4")
    const meu = { id: "meu", name: "Meu lote", style: "x", yeast: "y", stages: [{ name: "A", durationHours: 1, temp: 18 }] }
    localStorage.setItem("fermentador.batches", JSON.stringify([DEMO_BATCH, meu]))
    const first = await setup()
    const ids = first.result.current.batches.map((b) => b.id)
    expect(ids.slice(0, 2)).toEqual(["exemplo-apa", "meu"]) // os do usuário continuam na frente
    expect(ids).toContain("base-saison")
    act(() => first.result.current.deleteBatch("base-saison"))
    first.unmount()
    const second = await setup() // reabre: já migrou, não recria
    expect(second.result.current.batches.map((b) => b.id)).not.toContain("base-saison")
  })
})

describe("pausar a fermentação", () => {
  const demo = async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const hook = await setup()
    act(() => hook.result.current.startBatch("exemplo-apa")) // etapas de 15 s
    return hook
  }

  it("pausada, a etapa não acaba; ao retomar continua de onde parou", async () => {
    const { result } = await demo()
    await advance(5000) // 5 s da 1ª etapa
    act(() => result.current.pauseBatch())
    expect(result.current.run.pausedAt).toBeTruthy()
    await advance(60_000) // 1 min parada: passaria por várias etapas se andasse
    expect(result.current.run.stageIndex).toBe(0)
    act(() => result.current.resumeBatch())
    expect(result.current.run.pausedAt).toBeUndefined()
    await advance(8000) // faltavam ~10 s
    expect(result.current.run.stageIndex).toBe(0)
    await advance(4000)
    expect(result.current.run.stageIndex).toBe(1)
    const events = result.current.log.map((e) => e.event)
    expect(events).toContain("Fermentação pausada")
    expect(events).toContain("Fermentação retomada")
  })

  it("pausada, a placa continua mantendo a temperatura da etapa e não dá para pular", async () => {
    const { result } = await demo()
    await advance(3000)
    act(() => result.current.pauseBatch())
    await advance(4000)
    expect(result.current.telemetry.active).toBe(true) // a placa segue controlando
    expect(result.current.telemetry.setpoint).toBe(24) // alvo da 1ª etapa
    act(() => result.current.skipCurrentStage())
    expect(result.current.run.stageIndex).toBe(0) // pular fica desativado enquanto pausada
  })

  it("encerrar estando pausada fecha o registro como interrompida", async () => {
    const { result } = await demo()
    await advance(3000)
    act(() => result.current.pauseBatch())
    act(() => result.current.stopBatch())
    expect(result.current.run).toBeNull()
    expect(result.current.records.at(-1).status).toBe("stopped")
  })

  it("a pausa sobrevive a recarregar a página", async () => {
    const first = await demo()
    await advance(3000)
    act(() => first.result.current.pauseBatch())
    first.unmount()
    const second = renderHook(() => useFermenter())
    await advance(40_000)
    expect(second.result.current.run.pausedAt).toBeTruthy()
    expect(second.result.current.run.stageIndex).toBe(0)
  })
})

describe("dados do Modo dev separados dos da placa real", () => {
  it("as leituras, eventos e fermentações simuladas não aparecem com o Modo dev desligado (e voltam ao ligar)", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
    const { result } = await setup()
    act(() => result.current.startBatch("exemplo-apa"))
    await advance(20_000)
    act(() => result.current.stopBatch())
    expect(result.current.history.length).toBeGreaterThan(10)
    expect(result.current.records).toHaveLength(1)
    expect(result.current.log.length).toBeGreaterThan(0)

    await act(async () => {
      await result.current.setMode("live") // desliga o Modo dev
    })
    await advance(100)
    expect(result.current.history).toEqual([]) // "Ao vivo" não herda os pontos simulados
    expect(result.current.records).toEqual([])
    expect(result.current.log).toEqual([])
    expect(result.current.activeRecord).toBeNull()
    expect(result.current.telemetry).toBeNull()

    await act(async () => {
      await result.current.setMode("dev") // liga de novo: os dados simulados continuam lá
    })
    await advance(2000)
    expect(result.current.records).toHaveLength(1)
    expect(result.current.history.length).toBeGreaterThan(10)
  })

  it("o que a placa real grava não vai para o Modo dev", async () => {
    localStorage.clear()
    localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "live" }))
    localStorage.setItem("fermentador.history", JSON.stringify([{ t: Date.now() - 1000, actual: 18, setpoint: 18, ambient: 22 }]))
    localStorage.setItem("fermentador.log", JSON.stringify([{ id: 1, at: Date.now(), event: "Dispositivo conectado", value: "USB", severity: "info" }]))
    const { result } = await setup()
    expect(result.current.history).toHaveLength(1)
    expect(result.current.log).toHaveLength(1)
    await act(async () => {
      await result.current.setMode("dev")
    })
    await advance(100)
    expect(result.current.history).toEqual([]) // o Modo dev começa limpo
    expect(result.current.log.some((e) => e.value === "USB")).toBe(false) // o evento da placa real não aparece aqui
    await act(async () => {
      await result.current.setMode("live")
    })
    await advance(100)
    expect(result.current.history).toHaveLength(1) // a placa real continua como estava
    expect(JSON.parse(localStorage.getItem("fermentador.history"))).toHaveLength(1)
  })
})
