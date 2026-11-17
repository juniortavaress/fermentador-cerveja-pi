// Controles do circuito simulado (Modo dev): o potenciômetro (temperatura da câmara) e o NTC (ambiente).
// A tela muda estes valores; a placa virtual os lê a cada segundo. Ficam guardados no navegador.
//
// `auto`: a própria simulação move a câmara (em direção ao alvo da etapa) e o ambiente (oscilando),
// para dar para ver a fermentação funcionando sem mexer em nada, inclusive pelo celular.

const KEY = "fermentador.sim"

/** Faixas do circuito real: o pot do firmware vai de 0 a 35 °C; o ambiente (NTC) foi limitado a 0–50 °C. */
export const SIM_LIMITS = { chamber: { min: 0, max: 35 }, ambient: { min: 0, max: 50 } }
const DEFAULTS = { chamber: 22, ambient: 26, auto: false }

const clamp = (v, { min, max }) => Math.min(max, Math.max(min, v))
const round1 = (v) => Math.round(v * 10) / 10

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === "object") {
      return {
        chamber: clamp(Number(raw.chamber ?? DEFAULTS.chamber), SIM_LIMITS.chamber),
        ambient: clamp(Number(raw.ambient ?? DEFAULTS.ambient), SIM_LIMITS.ambient),
        auto: raw.auto === true,
      }
    }
  } catch {
    /* sem storage ou JSON ruim: usa o padrão */
  }
  return { ...DEFAULTS }
}

let state = load()
const listeners = new Set()

/** Valores atuais (o objeto só é trocado quando algo muda, então serve para useSyncExternalStore). */
export function getSimControl() {
  return state
}

export function setSimControl(patch) {
  const next = {
    chamber: clamp(round1(patch.chamber ?? state.chamber), SIM_LIMITS.chamber),
    ambient: clamp(round1(patch.ambient ?? state.ambient), SIM_LIMITS.ambient),
    auto: patch.auto ?? state.auto,
  }
  if (next.chamber === state.chamber && next.ambient === state.ambient && next.auto === state.auto) return
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  listeners.forEach((cb) => cb())
}

export function subscribeSimControl(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Só para testes: volta ao padrão. */
export function resetSimControl() {
  state = { ...DEFAULTS }
  listeners.forEach((cb) => cb())
}
