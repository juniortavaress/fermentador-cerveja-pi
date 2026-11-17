// Testa o SerialTransport contra uma porta serial falsa (sem placa conectada).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SerialTransport } from "./serial.js"

function makeFakePort({ failOpen = null } = {}) {
  const sent = []
  let controller
  const readable = new ReadableStream({ start: (c) => (controller = c) })
  const writable = new WritableStream({ write: (chunk) => void sent.push(new TextDecoder().decode(chunk)) })
  const port = {
    readable,
    writable,
    open: vi.fn(async () => {
      if (failOpen) throw failOpen
    }),
    close: vi.fn(async () => {}),
  }
  return {
    port,
    sent,
    push: (text) => controller.enqueue(new TextEncoder().encode(text)),
    unplug: () => controller.error(new Error("device lost")),
  }
}

function installSerial(serial) {
  Object.defineProperty(globalThis, "navigator", { value: serial ? { serial } : {}, configurable: true })
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

let fake
let transport
let lines
let statuses

function listen() {
  lines = []
  statuses = []
  transport.onLine((l) => lines.push(l))
  transport.onStatus((s, d) => statuses.push([s, d]))
}

beforeEach(() => {
  fake = makeFakePort()
  installSerial({ requestPort: async () => fake.port, getPorts: async () => [] })
  transport = new SerialTransport()
  listen()
})

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true })
})

describe("SerialTransport", () => {
  it("abre a porta a 115200 baud e avisa que conectou", async () => {
    expect(await transport.connect()).toBe(true)
    expect(fake.port.open).toHaveBeenCalledWith({ baudRate: 115200 })
    expect(statuses.map((s) => s[0])).toEqual(["connecting", "connected"])
    await transport.disconnect()
  })

  it("junta pedaços e entrega só linhas completas", async () => {
    await transport.connect()
    fake.push("# Fermentador iniciado\nSP:18.0,Tc")
    await tick()
    expect(lines).toEqual(["# Fermentador iniciado"])
    fake.push("aixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8\r\nSP:18.0")
    await tick()
    expect(lines).toEqual(["# Fermentador iniciado", "SP:18.0,Tcaixa:17.4,Tamb:27.9,Aquec:1,Frio:0,Rntc_k:8.8"])
    await transport.disconnect()
  })

  it("envia comandos terminados em quebra de linha", async () => {
    await transport.connect()
    await transport.send("SP 18.5")
    await transport.send("?")
    expect(fake.sent.join("")).toBe("SP 18.5\n?\n")
    await transport.disconnect()
  })

  it("desconectar fecha a porta e avisa sem tratar como falha", async () => {
    await transport.connect()
    await transport.disconnect()
    expect(fake.port.close).toHaveBeenCalled()
    expect(statuses.at(-1)).toEqual(["disconnected", undefined])
  })

  it("cabo puxado vira 'desconectado' com aviso", async () => {
    await transport.connect()
    fake.unplug()
    await tick(50)
    expect(statuses.at(-1)).toEqual(["disconnected", "Dispositivo desconectado."])
  })

  it("falha ao abrir a porta gera um erro curto e connect retorna false", async () => {
    const busy = makeFakePort({ failOpen: Object.assign(new Error("Failed to open serial port."), { name: "NetworkError" }) })
    installSerial({ requestPort: async () => busy.port, getPorts: async () => [] })
    transport = new SerialTransport()
    listen()
    expect(await transport.connect()).toBe(false)
    const last = statuses.at(-1)
    expect(last[0]).toBe("error")
    expect(last[1]).toBe("Falha ao conectar")
  })

  it("auto: sem porta autorizada não faz nada; com porta, reconecta sozinho", async () => {
    expect(await transport.connect({ auto: true })).toBe(false)
    expect(statuses).toEqual([])

    installSerial({ requestPort: async () => { throw new Error("não deveria pedir") }, getPorts: async () => [fake.port] })
    transport = new SerialTransport()
    listen()
    expect(await transport.connect({ auto: true })).toBe(true)
    await transport.disconnect()
  })

  it("usuário fecha a janela de escolha: retorna false sem erro", async () => {
    installSerial({ requestPort: async () => { throw new DOMException("No port selected", "NotFoundError") }, getPorts: async () => [] })
    transport = new SerialTransport()
    listen()
    expect(await transport.connect()).toBe(false)
    expect(statuses).toEqual([])
  })

  it("navegador sem Web Serial: erro explicando", async () => {
    installSerial(null)
    transport = new SerialTransport()
    listen()
    expect(await transport.connect()).toBe(false)
    expect(statuses.at(-1)[1]).toBe("Conexão indisponível neste navegador")
  })

  it("enviar sem conexão lança erro", async () => {
    await expect(transport.send("SP 18")).rejects.toThrow()
  })
})
