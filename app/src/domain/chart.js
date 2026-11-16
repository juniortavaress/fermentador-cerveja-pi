/** Pontos dentro da janela [now - rangeMs, now]. rangeMs null = tudo. */
export function sliceRange(history, now, rangeMs) {
  if (rangeMs == null) return history
  const from = now - rangeMs
  return history.filter((p) => p.t >= from)
}

/** Reduz a quantidade de pontos para o gráfico não pesar, mantendo o último. */
export function downsample(points, max = 240) {
  if (points.length <= max) return points
  const step = Math.ceil(points.length / max)
  return points.filter((_, i) => i % step === 0 || i === points.length - 1)
}

/** Mínimo, máximo e média da temperatura real. null se não há pontos. */
export function stats(points) {
  if (points.length === 0) return null
  let min = Infinity
  let max = -Infinity
  let sum = 0
  for (const p of points) {
    if (p.actual < min) min = p.actual
    if (p.actual > max) max = p.actual
    sum += p.actual
  }
  return { min, max, avg: sum / points.length }
}
