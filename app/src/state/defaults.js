/** @type {import("../domain/types.js").Settings} */
export const DEFAULT_SETTINGS = {
  hysteresis: 0.5,
  minCycleMin: 3,
  alerts: true,
  mode: "live",
}

/** Receitas de exemplo, só para começar. Podem ser apagadas. */
export const DEFAULT_BATCHES = [
  {
    id: "exemplo-ipa",
    name: "Exemplo · American IPA",
    style: "American IPA",
    yeast: "Levedura Ale",
    stages: [
      { name: "Lag", durationHours: 12, temp: 20 },
      { name: "Primária", durationHours: 72, temp: 18.5 },
      { name: "Secundária", durationHours: 48, temp: 17 },
      { name: "Maturação", durationHours: 96, temp: 4 },
    ],
  },
  {
    id: "exemplo-pilsen",
    name: "Exemplo · Pilsen",
    style: "Pilsen",
    yeast: "Levedura Lager",
    stages: [
      { name: "Inoculação", durationHours: 18, temp: 12 },
      { name: "Fermentação", durationHours: 120, temp: 11 },
      { name: "Descanso", durationHours: 36, temp: 16 },
      { name: "Maturação", durationHours: 168, temp: 3 },
    ],
  },
]

export const HISTORY_INTERVAL_MS = 60_000
export const HISTORY_MAX_MS = 72 * 3_600_000
export const LOG_MAX = 500
/** Desvio (°C) acima do qual gera alerta */
export const ALERT_THRESHOLD = 0.5
/** Depois de trocar o set point, a caixa precisa de tempo para acompanhar */
export const ALERT_GRACE_MS = 30 * 60_000
/** Sem telemetria por esse tempo = conexão sem dados */
export const STALE_MS = 6000
