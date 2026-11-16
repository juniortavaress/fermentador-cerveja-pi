import { useEffect, useState } from "react"

/** useState que guarda o valor no localStorage (falha em silêncio se o navegador bloquear). */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw)
    } catch {
      /* storage indisponível ou JSON inválido: usa o valor inicial */
    }
    return typeof initial === "function" ? initial() : initial
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])

  return [value, setValue]
}
