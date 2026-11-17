// Registro de cada fermentação: a curva de temperatura, quando cada etapa começou e como terminou.
// Fica guardado depois que a fermentação acaba, para consultar as variações dela.
import { appendHistory } from "./history.js"
import { downsample } from "./chart.js"

export const RECORDS_MAX = 10 // quantas fermentações antigas guardar
export const RECORD_POINTS_MAX = 1000 // pontos guardados por fermentação depois de terminada

const round1 = (n) => (n == null ? n : Math.round(n * 10) / 10)

/** Registro de uma fermentação que acabou de começar. */
export function newRecord(batch, startedAt, hysteresis) {
  return {
    id: `run-${startedAt}`,
    batchId: batch.id,
    name: batch.name,
    startedAt,
    endedAt: null,
    status: "running", // running | finished | stopped
    hysteresis,
    stages: batch.stages.map((s) => ({ name: s.name, temp: s.temp, durationHours: s.durationHours })),
    stageStarts: [startedAt], // quando cada etapa começou (a 1ª é o início)
    points: [],
  }
}

/** Acrescenta uma leitura. Segundo a segundo nos últimos 10 min; antes disso, um ponto por minuto. */
export function addPoint(rec, point) {
  const p = { t: point.t, actual: round1(point.actual), setpoint: round1(point.setpoint), ambient: round1(point.ambient) }
  return { ...rec, points: appendHistory(rec.points, p, { fineMs: 10 * 60_000, coarseMs: 60_000, maxMs: Infinity }) }
}

/** Anota o começo de uma nova etapa. */
export function noteStage(rec, at) {
  return { ...rec, stageStarts: [...rec.stageStarts, at] }
}

/** Fecha o registro (concluída ou interrompida) e enxuga os pontos para caber no navegador. */
export function finishRecord(rec, status, endedAt) {
  return { ...rec, status, endedAt, points: downsample(rec.points, RECORD_POINTS_MAX) }
}

/** Mín, máx e média de uma lista de pontos (temperatura da câmara). */
export function summarize(points) {
  if (points.length === 0) return null
  let min = Infinity
  let max = -Infinity
  let sum = 0
  for (const p of points) {
    if (p.actual < min) min = p.actual
    if (p.actual > max) max = p.actual
    sum += p.actual
  }
  return { min, max, avg: sum / points.length, count: points.length }
}

/** Resumo por etapa: alvo, quanto durou e como a temperatura se comportou nela. */
export function stageSummaries(rec, now = Date.now()) {
  const end = rec.endedAt ?? now
  return rec.stageStarts.map((startAt, i) => {
    const endAt = rec.stageStarts[i + 1] ?? end
    const inStage = rec.points.filter((p) => p.t >= startAt && p.t < endAt)
    return {
      index: i,
      name: rec.stages[i]?.name ?? `Etapa ${i + 1}`,
      temp: rec.stages[i]?.temp,
      startAt,
      endAt,
      ms: Math.max(0, endAt - startAt),
      stats: summarize(inStage),
    }
  })
}
