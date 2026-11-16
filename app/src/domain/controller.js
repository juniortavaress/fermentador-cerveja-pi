// Port em JavaScript de firmware/fermentador/controller.cpp.
// Usado só pelo simulador (modo Developer). Se mudar a regra no firmware, mude aqui também.

export function initialControlState() {
  return { heating: false, cooling: false, coolingChangedAt: 0, coolingEverChanged: false }
}

/**
 * @param {{setPoint:number, hysteresis:number, minCycleMs:number}} cfg
 * @param {ReturnType<typeof initialControlState>} state
 * @param {number} tChamber
 * @param {number|null} tAmbient
 * @param {number} nowMs
 */
export function controllerUpdate(cfg, state, tChamber, tAmbient, nowMs) {
  const next = { ...state }

  // Arrefecimento: ligado direto quando o set point está abaixo do ambiente.
  let want = state.cooling
  if (tAmbient === null) want = false
  else if (tAmbient > cfg.setPoint + cfg.hysteresis) want = true
  else if (tAmbient <= cfg.setPoint) want = false

  if (want !== state.cooling) {
    const canChange =
      tAmbient === null ||
      !state.coolingEverChanged ||
      nowMs - state.coolingChangedAt >= cfg.minCycleMs
    if (canChange) {
      next.cooling = want
      next.coolingChangedAt = nowMs
      next.coolingEverChanged = true
    }
  }

  // Aquecimento: controle fino com histerese.
  if (tChamber < cfg.setPoint - cfg.hysteresis) next.heating = true
  else if (tChamber >= cfg.setPoint) next.heating = false

  return next
}
