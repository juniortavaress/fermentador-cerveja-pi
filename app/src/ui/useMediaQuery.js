import { useEffect, useState } from "react"

/** true enquanto a tela casar com a consulta CSS (ex.: "(min-width: 1000px)"). Sem matchMedia, false. */
export function useMediaQuery(query) {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener?.("change", onChange)
    return () => mql.removeEventListener?.("change", onChange)
  }, [query])
  return matches
}

/** Computador (tem espaço para o circuito ao lado do celular). */
export const DESKTOP_QUERY = "(min-width: 1000px)"
export const useDesktop = () => useMediaQuery(DESKTOP_QUERY)
