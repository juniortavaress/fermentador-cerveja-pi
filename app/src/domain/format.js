const pad = (n) => String(n).padStart(2, "0")

/** "14/08 06:00" */
export function formatDateTime(ms) {
  const d = new Date(ms)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "06:00" */
export function formatClock(ms) {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** "14 ago. 2025" */
export function formatDate(ms) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(ms))
    .replace(/\s+de\s+/g, " ")
}

/** 18.5 -> "18,5" */
export function formatTemp(value, digits = 1) {
  return value.toFixed(digits).replace(".", ",")
}

/** 4 min | 2 h 10 min | 3 d 4 h */
export function formatDuration(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  if (totalMin < 1) return "menos de 1 min"
  if (totalMin < 60) return `${totalMin} min`
  const totalH = Math.floor(totalMin / 60)
  if (totalH < 24) {
    const m = totalMin % 60
    return m ? `${totalH} h ${m} min` : `${totalH} h`
  }
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  return h ? `${d} d ${h} h` : `${d} d`
}
