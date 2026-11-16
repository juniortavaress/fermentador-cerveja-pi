// @vitest-environment jsdom
// Teste de fumaça da interface: renderiza o app inteiro (modo simulador) e navega pelas abas.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import App from "./App.jsx"

async function advance(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem("fermentador.settings", JSON.stringify({ mode: "dev" }))
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

describe("App", () => {
  it("mostra a visão geral com dados do simulador", async () => {
    render(<App />)
    await advance(2000)
    expect(screen.getByText("Visão geral")).toBeTruthy()
    expect(screen.getByText("DEV MODE")).toBeTruthy()
    expect(screen.getByText("Parado")).toBeTruthy()
    expect(screen.getAllByText(/Exemplo · American IPA/).length).toBeGreaterThan(0)
  })

  it("navega por todas as abas sem quebrar", async () => {
    render(<App />)
    await advance(2000)
    for (const [name, title] of [
      ["Lote", "Lote"],
      ["Temp.", "Temperatura"],
      ["Registro", "Registro de Eventos"],
      ["Config.", "Configurações"],
      ["Início", "Visão geral"],
    ]) {
      tab(name)
      await advance(100)
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
  })

  it("fluxo completo: iniciar, pular etapa (com confirmação) e parar", async () => {
    render(<App />)
    await advance(2000)
    tab("Lote")
    fireEvent.click(screen.getByText(/Iniciar fermentação/))
    await advance(200)
    expect(screen.getAllByText(/em andamento/i).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText("Pular etapa"))
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getAllByText("Pular etapa").at(-1)) // botão de confirmar no diálogo
    await advance(200)
    expect(screen.queryByRole("dialog")).toBeNull()

    fireEvent.click(screen.getByText(/Parar/))
    fireEvent.click(screen.getAllByText("Parar").at(-1))
    await advance(200)
    expect(screen.getByText(/Iniciar fermentação/)).toBeTruthy()

    tab("Registro")
    expect(screen.getByText("Fermentação iniciada")).toBeTruthy()
    expect(screen.getByText("Fermentação interrompida")).toBeTruthy()
  })

  it("cria um lote pelo formulário", async () => {
    render(<App />)
    await advance(2000)
    tab("Lote")
    fireEvent.click(screen.getByText("Criar novo lote"))
    const [nameInput, styleInput] = screen.getAllByPlaceholderText("Ex.: Belgian Ale")
    fireEvent.change(nameInput, { target: { value: "Teste Stout" } })
    fireEvent.change(styleInput, { target: { value: "Stout" } })
    fireEvent.click(screen.getByText("Criar lote"))
    await advance(100)
    expect(screen.getAllByText("Teste Stout").length).toBeGreaterThan(0)
  })
})
