import { readFileSync, existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8")
const manifest = JSON.parse(read("public/manifest.webmanifest"))

describe("app instalável (PWA)", () => {
  it("o manifest tem o necessário para o Chrome oferecer a instalação, sem barra de endereço", () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone") // abre sem a barra do navegador
    expect(manifest.theme_color).toMatch(/^#/)
    expect(manifest.background_color).toMatch(/^#/)
  })

  it("tem ícones de 192 e 512 px (e um maskable) e os arquivos existem", () => {
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain("192x192")
    expect(sizes).toContain("512x512")
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true)
    for (const icon of manifest.icons) {
      expect(existsSync(new URL(`../public${icon.src}`, import.meta.url))).toBe(true)
    }
    expect(existsSync(new URL("../public/apple-touch-icon.png", import.meta.url))).toBe(true)
  })

  it("o index.html liga o manifest, o ícone do iPhone e o service worker existe", () => {
    const html = read("index.html")
    expect(html).toMatch(/rel="manifest" href="\/manifest.webmanifest"/)
    expect(html).toMatch(/rel="apple-touch-icon"/)
    expect(html).toMatch(/name="theme-color"/)
    expect(existsSync(new URL("../public/sw.js", import.meta.url))).toBe(true)
  })
})
