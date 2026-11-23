/** @type {import("../domain/types.js").Settings} */
export const DEFAULT_SETTINGS = {
  hysteresis: 0.5,
  minCycleMin: 3,
  alerts: true,
  unit: "C", // exibição: "C" ou "F" (os dados continuam em °C)
  mode: "live",
}

/**
 * Lote de demonstração: 5 etapas com temperaturas bem diferentes (8 a 31 °C).
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
    { name: "Descanso de diacetil", durationHours: seconds(15), temp: 31 },
    { name: "Crash", durationHours: seconds(15), temp: 8 },
    { name: "Condicionamento", durationHours: seconds(60), temp: 20 },
  ],
}

const days = (n) => n * 24

/** Receitas prontas para começar: estilos clássicos, com as etapas e temperaturas típicas de cada um. */
export const SAMPLE_BATCHES = [
  {
    id: "base-american-ipa",
    name: "American IPA",
    style: "Ale",
    yeast: "Safale US-05",
    stages: [
      { name: "Fermentação", durationHours: days(5), temp: 18.5 },
      { name: "Descanso de diacetil", durationHours: days(2), temp: 21 },
      { name: "Dry hop", durationHours: days(3), temp: 19 },
      { name: "Cold crash", durationHours: days(2), temp: 2 },
    ],
  },
  {
    id: "base-pilsen",
    name: "Pilsen",
    style: "Lager",
    yeast: "Saflager W-34/70",
    stages: [
      { name: "Fermentação", durationHours: days(7), temp: 10 },
      { name: "Descanso de diacetil", durationHours: days(2), temp: 16 },
      { name: "Maturação a frio", durationHours: days(14), temp: 2 },
    ],
  },
  {
    id: "base-weissbier",
    name: "Weissbier",
    style: "Trigo",
    yeast: "Safbrew WB-06",
    stages: [
      { name: "Fermentação", durationHours: days(4), temp: 20 },
      { name: "Maturação", durationHours: days(3), temp: 14 },
      { name: "Cold crash", durationHours: days(2), temp: 3 },
    ],
  },
  {
    id: "base-dry-stout",
    name: "Dry Stout",
    style: "Stout",
    yeast: "Safale S-04",
    stages: [
      { name: "Fermentação", durationHours: days(6), temp: 18 },
      { name: "Maturação", durationHours: days(7), temp: 12 },
    ],
  },
  {
    id: "base-belgian-tripel",
    name: "Belgian Tripel",
    style: "Belga",
    yeast: "Safbrew T-58",
    stages: [
      { name: "Fermentação", durationHours: days(3), temp: 20 },
      { name: "Finalização", durationHours: days(5), temp: 24 },
      { name: "Maturação a frio", durationHours: days(14), temp: 5 },
    ],
  },
  {
    id: "base-saison",
    name: "Saison",
    style: "Belga",
    yeast: "Belle Saison",
    stages: [
      { name: "Fermentação", durationHours: days(2), temp: 24 },
      { name: "Finalização quente", durationHours: days(5), temp: 30 },
      { name: "Maturação a frio", durationHours: days(7), temp: 4 },
    ],
  },
]

export const DEFAULT_BATCHES = [DEMO_BATCH, ...SAMPLE_BATCHES]

/** Exemplos antigos, removidos da lista na versão 2. A versão 4 atualizou o lote de demonstração (resfriador sem pausa); a 5 trouxe as receitas prontas (SAMPLE_BATCHES); a 6 baixou a etapa de diacetil para 31 °C. */
export const LEGACY_EXAMPLE_IDS = ["exemplo-ipa", "exemplo-pilsen"]
export const SEED_VERSION = "6"

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
