// @vitest-environment jsdom
// Teste de fumaça da interface: renderiza o app inteiro (modo simulador) e navega pelas abas.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App.jsx"
import { seedLongBatches } from "./state/testFixtures.js"

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
  seedLongBatches()
  // O recharts precisa de ResizeObserver, que o jsdom não tem.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const tab = (name) => fireEvent.click(screen.getByRole("button", { name }))
const click = (text) => fireEvent.click(screen.getByText(text))

describe("App", () => {
  it("mostra o início com dados do simulador", async () => {
    render(<App />)
    await advance(2000)
    expect(screen.getByText("Pronto para fermentar")).toBeTruthy()
    expect(screen.getByText("Conectado")).toBeTruthy()
    expect(screen.queryByText(/DEV MODE|Modo de operação/i)).toBeNull()
  })

  it("navega por todas as abas sem quebrar", async () => {
    render(<App />)
    await advance(2000)
    for (const [name, marker] of [
      ["Lotes", "+ Novo lote"],
      ["Histórico", "Mais fria"],
      ["Registro", "Só alertas"],
      ["Ajustes", "Placa (Arduino)"],
      ["Início", "Pronto para fermentar"],
    ]) {
      tab(name)
      await advance(100)
      expect(screen.getAllByText(marker).length).toBeGreaterThan(0)
    }
  })

  it("fluxo completo: iniciar, pular etapa (com confirmação) e parar", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(200)
    // volta ao Início já com a fermentação rodando
    expect(screen.getByText("Fermentando")).toBeTruthy()
    expect(screen.getByText("Etapa 1 de 4")).toBeTruthy()

    click("Pular etapa")
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getAllByText("Pular etapa").at(-1)) // confirmar no diálogo
    await advance(200)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Etapa 2 de 4")).toBeTruthy()

    click("Pausar")
    click("Encerrar")
    click("Encerrar fermentação")
    await advance(200)
    expect(screen.getByText("Pronto para fermentar")).toBeTruthy()

    tab("Registro")
    expect(screen.getByText("Fermentação iniciada")).toBeTruthy()
    expect(screen.getByText("Fermentação interrompida")).toBeTruthy()
  })

  it("cria um lote pelo formulário", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("+ Novo lote")
    fireEvent.change(screen.getByPlaceholderText("Ex.: Minha IPA"), { target: { value: "Teste Stout" } })
    click("Criar lote")
    await advance(100)
    expect(screen.getAllByText("Teste Stout").length).toBeGreaterThan(0)
    expect(screen.getByText(/Iniciar fermentação/)).toBeTruthy()
  })

  it("o ajuste fino é do lote: aparece na receita e no formulário, não nos Ajustes", async () => {
    render(<App />)
    await advance(2000)
    tab("Ajustes")
    expect(screen.queryByText("Tolerância")).toBeNull()
    tab("Lotes")
    click("+ Novo lote")
    expect(screen.getByText("Tolerância")).toBeTruthy()
    expect(screen.queryByText("Descanso do resfriador")).toBeNull()
    fireEvent.change(screen.getByPlaceholderText("Ex.: Minha IPA"), { target: { value: "Lote Fino" } })
    click("Econômico")
    fireEvent.click(screen.getByLabelText("Aumentar tolerância")) // 1,0 -> 1,1
    fireEvent.click(screen.getByLabelText("Aumentar tolerância")) // -> 1,2
    click("Criar lote")
    await advance(100)
    // detalhe do lote criado mostra o valor escolhido
    expect(screen.getByText(/±1,2/)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem("fermentador.batches")).at(-1).hysteresis).toBe(1.2)
  })

  it("a unidade de temperatura (°C/°F) muda a exibição, sem mexer nos dados", async () => {
    render(<App />)
    await advance(2000)
    tab("Ajustes")
    expect(screen.getByText("Alerta se a temperatura exceder ±0,5 °C")).toBeTruthy()
    fireEvent.click(screen.getByRole("tab", { name: "°F" }))
    expect(screen.getByText("Alerta se a temperatura exceder ±0,9 °F")).toBeTruthy()
    // etapa de 20 °C = 68 °F na receita de exemplo
    tab("Lotes")
    click("Exemplo · American IPA")
    expect(screen.getByText(/68,0 °F/)).toBeTruthy()
    // o dado guardado continua em °C
    expect(JSON.parse(localStorage.getItem("fermentador.batches"))?.[0]?.stages?.[0]?.temp ?? 20).toBe(20)
    expect(JSON.parse(localStorage.getItem("fermentador.settings")).unit).toBe("F")
  })

  it("na aba Temperatura o alvo só aparece com fermentação em andamento", async () => {
    render(<App />)
    await advance(5000)
    tab("Histórico")
    expect(screen.queryByText("Alvo da etapa")).toBeNull()
    expect(screen.queryByText(/Azul = câmara/)).toBeNull() // sem legenda no gráfico
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(3000)
    tab("Histórico")
    expect(screen.getByText("Alvo da etapa")).toBeTruthy()
  })

  it("tocar em Lotes volta para a lista (sem botão de voltar)", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    expect(screen.getByText(/Iniciar fermentação/)).toBeTruthy()
    expect(screen.queryByText(/‹/)).toBeNull()
    tab("Lotes")
    expect(screen.getByText("+ Novo lote")).toBeTruthy()
    click("+ Novo lote")
    expect(screen.queryByText(/Voltar/)).toBeNull()
    tab("Lotes")
    expect(screen.getByText("+ Novo lote")).toBeTruthy()
    expect(screen.queryByText("Criar lote")).toBeNull()
  })

  it("aceita etapa acima de 30 °C no formulário (até o limite da placa)", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("+ Novo lote")
    fireEvent.change(screen.getByPlaceholderText("Ex.: Minha IPA"), { target: { value: "Quente" } })
    fireEvent.change(screen.getAllByDisplayValue("18")[0], { target: { value: "35" } })
    click("Criar lote")
    await advance(100)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(JSON.parse(localStorage.getItem("fermentador.batches")).at(-1).stages[0].temp).toBe(35)
  })

  it("edita as etapas da receita (nome, temperatura e duração em segundos/minutos/horas)", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click("Editar")
    // duração de 12 h aparece como 12 horas; muda a 1ª etapa para 30 segundos e 22 °C
    expect(screen.getByLabelText("Duração da etapa 1").value).toBe("12")
    fireEvent.change(screen.getByLabelText("Nome da etapa 1"), { target: { value: "Partida" } })
    fireEvent.change(screen.getByLabelText("Duração da etapa 1"), { target: { value: "30" } })
    fireEvent.change(screen.getByLabelText("Unidade de tempo da etapa 1"), { target: { value: "s" } })
    fireEvent.change(screen.getAllByDisplayValue("20")[0], { target: { value: "22" } })
    click("+ Adicionar etapa")
    fireEvent.change(screen.getByLabelText("Nome da etapa 5"), { target: { value: "Extra" } })
    click("Salvar etapas")
    await advance(100)
    const saved = JSON.parse(localStorage.getItem("fermentador.batches"))[0].stages
    expect(saved).toHaveLength(5)
    expect(saved[0].name).toBe("Partida")
    expect(saved[0].temp).toBe(22)
    expect(Math.round(saved[0].durationHours * 3600)).toBe(30)
    expect(screen.getByText("Partida")).toBeTruthy()
    expect(screen.getByText(/30 s/)).toBeTruthy()
  })

  it("etapa inválida na edição mostra o erro e não salva; cancelar descarta", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click("Editar")
    fireEvent.change(screen.getByLabelText("Nome da etapa 1"), { target: { value: "" } })
    click("Salvar etapas")
    expect(screen.getByRole("alert").textContent).toMatch(/Etapa 1/)
    click("Cancelar")
    expect(screen.getByText("Lag")).toBeTruthy()
  })

  it("não dá para editar as etapas de um lote em andamento", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(500)
    tab("Lotes")
    click("Exemplo · American IPA")
    expect(screen.queryByText("Editar")).toBeNull()
  })

  it("menu de três pontos na lista: iniciar, editar e apagar (não há apagar dentro do lote)", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    const menu = () => fireEvent.click(screen.getByLabelText("Opções de Exemplo · Pilsen"))

    // "Editar" abre o lote na tela das etapas; só ao tocar em "Editar" lá dentro os campos ficam editáveis
    menu()
    click("Editar")
    expect(screen.getByText("Etapas da receita")).toBeTruthy()
    expect(screen.queryByText("Salvar etapas")).toBeNull()
    click("Editar")
    expect(screen.getByText("Salvar etapas")).toBeTruthy()
    tab("Lotes")

    // apagar pede confirmação
    menu()
    click("Apagar lote")
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getAllByText("Apagar lote").at(-1))
    await advance(100)
    expect(screen.queryByText("Exemplo · Pilsen")).toBeNull()
    expect(JSON.parse(localStorage.getItem("fermentador.batches")).map((b) => b.id)).toEqual(["exemplo-ipa"])

    // iniciar pelo menu vai para o Início com a fermentação rodando
    fireEvent.click(screen.getByLabelText("Opções de Exemplo · American IPA"))
    click("▶ Iniciar fermentação")
    await advance(300)
    expect(screen.getByText("Fermentando")).toBeTruthy()

    // dentro do lote não existe mais "Apagar"
    tab("Lotes")
    click("Exemplo · American IPA")
    expect(screen.queryByText(/Apagar/)).toBeNull()
  })

  it("no menu, lote em andamento não pode ser editado nem apagado", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(300)
    tab("Lotes")
    fireEvent.click(screen.getByLabelText("Opções de Exemplo · American IPA"))
    expect(screen.getByText("Editar").closest("button").disabled).toBe(true)
    expect(screen.getByText("Apagar lote").closest("button").disabled).toBe(true)
  })

  it("depois de rodar uma fermentação, dá para ver a curva e as etapas dela em Histórico > Fermentações", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(8000)
    tab("Histórico")
    click("Fermentações")
    expect(screen.getByText("Em andamento")).toBeTruthy() // ela aparece já enquanto roda
    // parar pelo Início
    tab("Início")
    click("Pausar")
    click("Encerrar")
    click("Encerrar fermentação")
    await advance(300)

    tab("Histórico")
    click("Fermentações")
    expect(screen.getByText("Interrompida")).toBeTruthy()
    click("Exemplo · American IPA")
    expect(screen.getByText("Etapas")).toBeTruthy()
    expect(screen.getByText("Lag")).toBeTruthy() // 1ª etapa, com alvo e média
    expect(screen.getByText(/Alvo 20,0 °C/)).toBeTruthy()
    expect(screen.getByText("Mais fria")).toBeTruthy()

    // tocar em "Fermentações" de novo volta para a lista
    click("Fermentações")
    expect(screen.getByText("Interrompida")).toBeTruthy()
    expect(screen.queryByText("Mais fria")).toBeNull()
  })

  it("apaga um registro pelo menu de três pontos", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(3000)
    tab("Início")
    click("Pausar")
    click("Encerrar")
    click("Encerrar fermentação")
    await advance(300)
    tab("Histórico")
    click("Fermentações")
    fireEvent.click(screen.getByLabelText(/Opções do registro Exemplo · American IPA/))
    click("Apagar registro")
    fireEvent.click(screen.getAllByText("Apagar registro").at(-1))
    await advance(100)
    expect(screen.getByText(/Nenhuma fermentação ainda/)).toBeTruthy()
  })

  it("o menu de três pontos fecha com Esc ou clicando fora (sem botão Fechar)", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    const open = () => fireEvent.click(screen.getByLabelText("Opções de Exemplo · Pilsen"))

    open()
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.queryByText("Fechar")).toBeNull()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()

    open()
    fireEvent.click(screen.getByRole("dialog")) // fundo escurecido, fora do cartão
    expect(screen.queryByRole("dialog")).toBeNull()

    open()
    fireEvent.click(screen.getByText("Editar").closest(".sheet")) // clicar dentro não fecha
    expect(screen.getByRole("dialog")).toBeTruthy()
  })

  it("gráfico da fermentação: dá para arrastar para voltar no tempo e retornar ao vivo", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(130_000) // 2 min rodando
    expect(screen.getByText("Desta fermentação")).toBeTruthy()
    expect(screen.queryByText("Ao vivo ›")).toBeNull() // ao vivo: sem botão de retorno
    expect(screen.queryByLabelText("Voltar no tempo")).toBeNull() // sem setas nem seletor de janela
    expect(screen.queryByText("10 min")).toBeNull()

    const chart = screen.getByTestId("run-chart-drag")
    fireEvent.pointerDown(chart, { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(chart, { clientX: 150, pointerId: 1 }) // arrasta para a direita = volta no tempo
    fireEvent.pointerUp(chart, { pointerId: 1 })
    expect(screen.getByText("Ao vivo ›")).toBeTruthy()
    expect(screen.getByText(/Voltou/)).toBeTruthy()

    // arrastar para o outro lado, até o presente, volta ao vivo
    fireEvent.pointerDown(chart, { clientX: 150, pointerId: 1 })
    fireEvent.pointerMove(chart, { clientX: 0, pointerId: 1 })
    fireEvent.pointerUp(chart, { pointerId: 1 })
    expect(screen.queryByText("Ao vivo ›")).toBeNull()

    // e o botão também volta ao vivo
    fireEvent.pointerDown(chart, { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(chart, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(chart, { pointerId: 1 })
    fireEvent.click(screen.getByText("Ao vivo ›"))
    expect(screen.queryByText(/Voltou/)).toBeNull()
  })

  it("com fermentação rodando, o Início mostra o progresso por etapa, a duração total e os indicadores", async () => {
    render(<App />)
    await advance(2000)
    expect(screen.queryByText("Progresso da fermentação")).toBeNull() // sem fermentação, nada disso aparece
    expect(screen.queryByText("Temp. mín.")).toBeNull()

    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(8000)

    expect(screen.getByText("Progresso da fermentação")).toBeTruthy()
    // uma barra por etapa, com nome e temperatura
    // só as 4 primeiras letras, em maiúsculo e sem reticências
    for (const name of ["LAG", "PRIM", "SECU", "MATU"]) expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    expect(screen.queryByText(/…|\.\.\./)).toBeNull()
    for (const temp of ["20,0 °C", "18,5 °C", "17,0 °C", "4,0 °C"]) expect(screen.getAllByText(temp).length).toBeGreaterThan(0)
    // 12 + 72 + 48 + 96 = 228 h = 9 d 12 h
    expect(screen.getByText("9 d 12 h")).toBeTruthy()
    expect(screen.getByText(/Duração total/)).toBeTruthy()
    expect(screen.getByText(/Decorrido/)).toBeTruthy()

    for (const label of ["Temp. mín.", "Temp. máx.", "Peltier", "Resistência"]) expect(screen.getByText(label)).toBeTruthy()
    expect(screen.getByText("Peltier").parentElement.textContent).toMatch(/Resfriando|Inativo/)
    expect(screen.getByText("Resistência").parentElement.textContent).toMatch(/Aquecendo|Inativa/)
    expect(screen.getByText("Temp. mín.").parentElement.textContent).toMatch(/\d+,\d °C/) // já tem leituras desta fermentação

    // parar: tudo some de novo
    click("Pausar")
    click("Encerrar")
    click("Encerrar fermentação")
    await advance(300)
    expect(screen.queryByText("Progresso da fermentação")).toBeNull()
    expect(screen.queryByText("Temp. mín.")).toBeNull()
  })

  describe("Modo dev (circuito ao lado do celular)", () => {
    const desktop = () => {
      window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })
    }
    afterEach(() => {
      delete window.matchMedia
    })

    it("no celular (tela estreita) não cabe o painel do circuito, mas o Modo dev continua em Ajustes", async () => {
      render(<App />)
      await advance(2000)
      expect(screen.queryByLabelText("Circuito simulado")).toBeNull()
      tab("Ajustes")
      expect(screen.getByRole("switch", { name: "Modo dev" }).getAttribute("aria-checked")).toBe("true")
      expect(screen.queryByRole("switch", { name: "Simulação automática" })).toBeNull() // não existe mais: o Simular cuida disso
    })

    it("no computador, o Modo dev liga e desliga o circuito pelo interruptor em Ajustes", async () => {
      desktop()
      render(<App />)
      await advance(2000)
      expect(screen.getByLabelText("Circuito simulado")).toBeTruthy() // o modo salvo é dev
      tab("Ajustes")
      const sw = screen.getByRole("switch", { name: "Modo dev" })
      expect(sw.getAttribute("aria-checked")).toBe("true")
      fireEvent.click(sw)
      await advance(200)
      expect(screen.queryByLabelText("Circuito simulado")).toBeNull()
      expect(JSON.parse(localStorage.getItem("fermentador.settings")).mode).toBe("live")
      fireEvent.click(screen.getByRole("switch", { name: "Modo dev" }))
      await advance(2500)
      expect(screen.getByLabelText("Circuito simulado")).toBeTruthy()
      expect(screen.getAllByText("Conectado").length).toBeGreaterThan(0) // a placa simulada conectou sozinha
    })

    it("o potenciômetro define a temperatura interna e o ambiente é fixo; a mola e a ventoinha reagem às saídas", async () => {
      desktop()
      render(<App />)
      await advance(2000)
      const coil = () => screen.getByTestId("coil").getAttribute("data-on")
      const fan = () => screen.getByTestId("fan").getAttribute("data-on")
      expect(coil()).toBe("false") // em espera: tudo desligado
      expect(fan()).toBe("false")

      fireEvent.change(screen.getByLabelText("Temperatura interna (potenciômetro)"), { target: { value: "10" } })
      fireEvent.change(screen.getByLabelText("Temperatura ambiente (NTC)"), { target: { value: "30" } })
      await advance(2000)
      expect(screen.getByText("Temperatura da câmara").parentElement.textContent).toMatch(/10,0/)

      tab("Lotes")
      click("Exemplo · American IPA") // 1ª etapa: 20 °C
      click(/Iniciar fermentação/)
      await advance(4000)
      expect(coil()).toBe("true") // câmara a 10 °C, alvo 20 °C: aquece (mola acesa)
      expect(fan()).toBe("true") // ambiente 30 °C acima do alvo: resfria (ventoinha gira)
      expect(screen.queryByText("Controlando")).toBeNull() // sem esse texto no desenho
      expect(document.querySelector("animateTransform")).toBeTruthy() // a ventoinha está girando

      click("Pausar")
      click("Encerrar")
      click("Encerrar fermentação")
      await advance(3000)
      expect(coil()).toBe("false")
      expect(fan()).toBe("false")
      expect(screen.getAllByText("Em espera").length).toBeGreaterThan(0)
    })
  })

  it("controles da fermentação: Pausar/Pular rodando; Retomar/Encerrar pausada", async () => {
    render(<App />)
    await advance(2000)
    tab("Lotes")
    click("Exemplo · American IPA")
    click(/Iniciar fermentação/)
    await advance(500)

    // rodando: Pausar e Pular etapa; nada de Encerrar
    expect(screen.getByText("Pausar")).toBeTruthy()
    expect(screen.getByText("Pular etapa")).toBeTruthy()
    expect(screen.queryByText("Encerrar")).toBeNull()
    expect(screen.queryByText("Retomar")).toBeNull()

    click("Pausar")
    // pausada: Retomar e Encerrar; sem Pausar nem Pular
    expect(screen.getByText("Retomar")).toBeTruthy()
    expect(screen.getByText("Encerrar")).toBeTruthy()
    expect(screen.queryByText("Pausar")).toBeNull()
    expect(screen.queryByText("Pular etapa")).toBeNull()
    expect(screen.getByText("Pausada")).toBeTruthy() // selo no card

    click("Retomar")
    expect(screen.getByText("Pausar")).toBeTruthy()
    expect(screen.getByText("Fermentando")).toBeTruthy()

    // encerrar pede confirmação e só existe pausada
    click("Pausar")
    click("Encerrar")
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getByText("Cancelar"))
    expect(screen.getByText("Retomar")).toBeTruthy() // continua pausada
    click("Encerrar")
    click("Encerrar fermentação")
    await advance(300)
    expect(screen.getByText("Pronto para fermentar")).toBeTruthy()
  })

  describe("Simular (Modo dev no celular)", () => {
    const menu = (name) => fireEvent.click(screen.getByLabelText(`Opções de ${name}`))

    it("o menu de três pontos só tem Simular com o Modo dev ligado", async () => {
      render(<App />)
      await advance(2000)
      tab("Lotes")
      menu("Exemplo · Pilsen")
      expect(screen.getByText("Simular")).toBeTruthy()
      fireEvent.keyDown(window, { key: "Escape" })

      tab("Ajustes")
      fireEvent.click(screen.getByRole("switch", { name: "Modo dev" })) // desliga
      await advance(300)
      tab("Lotes")
      menu("Exemplo · Pilsen")
      expect(screen.queryByText("Simular")).toBeNull()
    })

    it("Simular inicia a fermentação e a câmara e o ambiente se mexem sozinhos, sem tocar em nada", async () => {
      render(<App />)
      await advance(2000)
      tab("Lotes")
      menu("Exemplo · American IPA") // 1ª etapa: 20 °C
      click("Simular")
      await advance(500)
      expect(screen.getByText("Fermentando")).toBeTruthy() // foi para o Início, já rodando
      expect(JSON.parse(localStorage.getItem("fermentador.sim")).auto).toBe(true)

      const chamber = () => JSON.parse(localStorage.getItem("fermentador.sim")).chamber
      const ambient = () => JSON.parse(localStorage.getItem("fermentador.sim")).ambient
      const c0 = chamber()
      const seen = new Set()
      for (let i = 0; i < 40; i++) {
        await advance(1000)
        seen.add(ambient())
      }
      expect(Math.abs(chamber() - 20)).toBeLessThan(1) // câmara foi até o alvo da etapa
      expect(chamber()).not.toBe(c0) // e saiu de onde estava
      expect(seen.size).toBeGreaterThan(3) // o ambiente também variou
    })

    it("Simular fica desativado com outra fermentação em andamento", async () => {
      render(<App />)
      await advance(2000)
      tab("Lotes")
      click("Exemplo · American IPA")
      click(/Iniciar fermentação/)
      await advance(300)
      tab("Lotes")
      menu("Exemplo · Pilsen")
      expect(screen.getByText("Simular").closest("button").disabled).toBe(true)
    })

    it("a simulação automática para sozinha quando a fermentação é encerrada", async () => {
      render(<App />)
      await advance(2000)
      tab("Lotes")
      menu("Exemplo · American IPA")
      click("Simular")
      await advance(2500)
      const auto = () => JSON.parse(localStorage.getItem("fermentador.sim")).auto
      expect(auto()).toBe(true)
      click("Pausar")
      click("Encerrar")
      click("Encerrar fermentação")
      await advance(3000)
      expect(auto()).toBe(false) // câmara e ambiente voltam a ficar como estão
      tab("Ajustes")
      expect(screen.queryByText("Simulação automática")).toBeNull()
    })

    it("no computador, mexer num slider do circuito assume o controle (desliga o automático)", async () => {
      window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} })
      render(<App />)
      await advance(2000)
      tab("Lotes")
      menu("Exemplo · American IPA")
      click("Simular")
      await advance(500)
      expect(screen.getByText("Automático")).toBeTruthy()
      fireEvent.change(screen.getByLabelText("Temperatura interna (potenciômetro)"), { target: { value: "5" } })
      expect(JSON.parse(localStorage.getItem("fermentador.sim")).auto).toBe(false)
      expect(screen.queryByText("Automático")).toBeNull()
      delete window.matchMedia
    })
  })
})
