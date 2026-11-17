// Temperaturas são sempre guardadas e enviadas à placa em °C. Aqui só convertemos para exibir (°C ou °F).

export const toUnit = (c, unit) => (unit === "F" ? (c * 9) / 5 + 32 : c)
export const fromUnit = (v, unit) => (unit === "F" ? ((v - 32) * 5) / 9 : v)
/** Diferença (tolerância, desvio): só escala, sem o deslocamento de 32. */
export const deltaToUnit = (c, unit) => (unit === "F" ? (c * 9) / 5 : c)

/** 18.5 -> "18,5" (ou "65,3" em °F) */
export const fmtTemp = (c, unit, digits = 1) => toUnit(c, unit).toFixed(digits).replace(".", ",")
export const fmtDelta = (c, unit, digits = 1) => deltaToUnit(c, unit).toFixed(digits).replace(".", ",")

/** Converte os pontos do histórico para a unidade escolhida (para os gráficos). */
export const convertPoints = (points, unit) =>
  unit === "F"
    ? points.map((p) => ({
        ...p,
        actual: toUnit(p.actual, unit),
        setpoint: p.setpoint == null ? p.setpoint : toUnit(p.setpoint, unit),
        ambient: p.ambient == null ? p.ambient : toUnit(p.ambient, unit),
      }))
    : points
