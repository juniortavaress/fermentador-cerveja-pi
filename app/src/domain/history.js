// Histórico de temperatura: um ponto por segundo nos últimos minutos e um por minuto no restante.
// Assim a apresentação mostra a variação em tempo real, e os dias de fermentação cabem no navegador.

/**
 * Acrescenta um ponto e compacta o que ficou antigo.
 * @param {Array<{t:number}>} history  pontos em ordem de tempo
 * @param {{t:number}} point           ponto novo
 * @param {{fineMs:number, coarseMs:number, maxMs:number}} opts
 *   fineMs = janela recente mantida segundo a segundo; coarseMs = espaçamento do que for mais antigo; maxMs = descarte
 */
export function appendHistory(history, point, { fineMs, coarseMs, maxMs }) {
  const out = []
  let lastBucket = null
  for (const p of [...history, point]) {
    const age = point.t - p.t
    if (age > maxMs) continue
    if (age <= fineMs) {
      out.push(p)
      continue
    }
    const bucket = Math.floor(p.t / coarseMs)
    if (bucket !== lastBucket) {
      out.push(p)
      lastBucket = bucket
    }
  }
  return out
}
