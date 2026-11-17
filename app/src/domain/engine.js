// Motor das fermentações: funções puras que decidem em que etapa o lote está.
// O tempo vem do relógio (Date.now), não de contadores, então sobrevive a recarregar a página.

export const HOUR_MS = 3_600_000

function stageMs(stage) {
  return Math.max(stage.durationHours * HOUR_MS, 1000)
}

/** "Agora" da fermentação: fica parado no instante da pausa enquanto ela estiver pausada. */
export const runClock = (run, now) => run.pausedAt ?? now

/** Pausa: congela o relógio das etapas. */
export function pauseRun(run, now) {
  return run.pausedAt ? run : { ...run, pausedAt: now }
}

/** Retoma: empurra o início da etapa pelo tempo parado, então sobra exatamente o que faltava. */
export function resumeRun(run, now) {
  if (!run.pausedAt) return run
  const stopped = Math.max(0, now - run.pausedAt)
  const { pausedAt, ...rest } = run
  return { ...rest, startedAt: rest.startedAt + stopped, stageStartedAt: rest.stageStartedAt + stopped }
}

export function startRun(batch, now) {
  return { batchId: batch.id, startedAt: now, stageIndex: 0, stageStartedAt: now }
}

/**
 * Avança o lote conforme o relógio. Se a página ficou fechada, pode passar por
 * várias etapas de uma vez; cada etapa nova começa no instante em que a anterior acabou.
 * @returns {{run: object|null, events: Array<{type:"stage",fromIndex:number,toIndex:number,at:number}|{type:"finished",at:number}>}}
 *   run null = a fermentação terminou
 */
export function advanceRun(run, batch, now) {
  now = runClock(run, now) // pausada: o tempo não passa
  let current = run
  const events = []
  for (;;) {
    const stage = batch.stages[current.stageIndex]
    if (!stage) return { run: null, events }
    const end = current.stageStartedAt + stageMs(stage)
    if (now < end) break
    if (current.stageIndex + 1 >= batch.stages.length) {
      events.push({ type: "finished", at: end })
      return { run: null, events }
    }
    events.push({
      type: "stage",
      fromIndex: current.stageIndex,
      toIndex: current.stageIndex + 1,
      at: end,
    })
    current = { ...current, stageIndex: current.stageIndex + 1, stageStartedAt: end }
  }
  return { run: current, events }
}

/** Pula para a próxima etapa agora. Na última etapa, encerra o lote. */
export function skipStage(run, batch, now) {
  if (run.stageIndex + 1 >= batch.stages.length) {
    return { run: null, events: [{ type: "finished", at: now }] }
  }
  return {
    run: { ...run, stageIndex: run.stageIndex + 1, stageStartedAt: now },
    events: [{ type: "stage", fromIndex: run.stageIndex, toIndex: run.stageIndex + 1, at: now }],
  }
}

export function stageRemainingMs(run, batch, now) {
  const stage = batch.stages[run.stageIndex]
  if (!stage) return 0
  return Math.max(0, run.stageStartedAt + stageMs(stage) - runClock(run, now))
}

/** 0..1 de progresso dentro da etapa atual. */
export function stageFraction(run, batch, now) {
  const stage = batch.stages[run.stageIndex]
  if (!stage) return 1
  return Math.min(1, Math.max(0, (runClock(run, now) - run.stageStartedAt) / stageMs(stage)))
}

export function totalHours(batch) {
  return batch.stages.reduce((sum, s) => sum + s.durationHours, 0)
}

/** Set point que o lote exige agora. */
export function runSetpoint(run, batch) {
  return batch.stages[run.stageIndex]?.temp ?? null
}

// ── Alerta de desvio ────────────────────────────────────────────────────────

export const initialDeviation = { active: false, graceUntil: 0 }

/** Depois de trocar o set point a caixa leva horas para acompanhar: não alerta nesse período. */
export function deviationOnSetpointChange(state, now, graceMs) {
  return { ...state, graceUntil: now + graceMs }
}

/** Gera no máximo um evento por excursão: "start" ao passar do limite, "end" ao voltar à metade dele. */
export function evaluateDeviation(state, deviation, now, threshold) {
  const abs = Math.abs(deviation)
  if (!state.active && now >= state.graceUntil && abs > threshold) {
    return { state: { ...state, active: true }, event: "start" }
  }
  if (state.active && abs <= threshold / 2) {
    return { state: { ...state, active: false }, event: "end" }
  }
  return { state, event: null }
}
