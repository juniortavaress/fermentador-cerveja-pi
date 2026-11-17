/** @type {import("../domain/types.js").Settings} */
export const DEFAULT_SETTINGS = {
  hysteresis: 0.5,
  minCycleMin: 3,
  alerts: true,
  unit: "C", // exibição: "C" ou "F" (os dados continuam em °C)
  mode: "live",
}

/**
 * Lote de demonstração: 5 etapas com temperaturas bem diferentes (8 a 35 °C).
 * As 4 primeiras duram 15 s cada (1 min no total) e a última dura 1 min.
 */
const seconds = (n) => n / 3600
export const DEMO_BATCH = {
  id: "exemplo-apa",
  name: "American Pale Ale",
  style: "American Pale Ale",
  yeast: "Levedura Ale",
  // Sem pausa mínima do resfriador: ele precisa reagir na hora a cada troca de etapa (15 s).
  minCycleMin: 0,
  stages: [
    { name: "Inoculação", durationHours: seconds(15), temp: 24 },
    { name: "Primária", durationHours: seconds(15), temp: 16 },
    { name: "Descanso de diacetil", durationHours: seconds(15), temp: 35 },
    { name: "Crash", durationHours: seconds(15), temp: 8 },
    { name: "Condicionamento", durationHours: seconds(60), temp: 20 },
  ],
}

export const DEFAULT_BATCHES = [DEMO_BATCH]

/** Exemplos antigos, removidos da lista na versão 2. A versão 4 atualizou o lote de demonstração (etapa de 35 °C, resfriador sem pausa). */
export const LEGACY_EXAMPLE_IDS = ["exemplo-ipa", "exemplo-pilsen"]
export const SEED_VERSION = "4"

// Um ponto a cada segundo (a placa manda 1 por segundo; 900 ms evita perder um por atraso).
export const HISTORY_INTERVAL_MS = 900
/** Segundo a segundo na última hora; antes disso, um ponto por minuto. */
export const HISTORY_FINE_MS = 3_600_000
export const HISTORY_COARSE_MS = 60_000
export const HISTORY_MAX_MS = 72 * 3_600_000
export const LOG_MAX = 500
/** Desvio (°C) acima do qual gera alerta */
export const ALERT_THRESHOLD = 0.5
/** Depois de trocar o set point, a caixa precisa de tempo para acompanhar */
export const ALERT_GRACE_MS = 30 * 60_000
/** Sem telemetria por esse tempo = conexão sem dados */
export const STALE_MS = 6000
