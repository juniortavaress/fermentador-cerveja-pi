import { useCallback, useEffect, useState } from "react"

function load(key, initial) {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) return JSON.parse(raw)
  } catch {
    /* storage indisponível ou JSON inválido: usa o valor inicial */
  }
  return typeof initial === "function" ? initial() : initial
}

/**
 * useState que guarda o valor no localStorage (falha em silêncio se o navegador bloquear).
 * Se a `key` mudar, passa a usar (e a guardar em) o valor daquela outra chave.
 */
export function usePersistentState(key, initial) {
  const [state, setState] = useState(() => ({ key, value: load(key, initial) }))

  // Chave nova (ex.: trocou o Modo dev): carrega o que está guardado nela, durante a própria renderização.
  let current = state
  if (state.key !== key) {
    current = { key, value: load(key, initial) }
    setState(current)
  }

  useEffect(() => {
    try {
      localStorage.setItem(current.key, JSON.stringify(current.value))
    } catch {
      /* ignore */
    }
  }, [current.key, current.value])

  const setValue = useCallback(
    (next) => setState((s) => ({ ...s, value: typeof next === "function" ? next(s.value) : next })),
    [],
  )

  return [current.value, setValue]
}
