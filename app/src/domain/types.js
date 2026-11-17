// Formatos dos dados do app (só documentação, via JSDoc; o JavaScript não checa tipos).

/**
 * @typedef {Object} BatchStage
 * @property {string} name
 * @property {number} durationHours
 * @property {number} temp  °C
 */

/**
 * Receita: um conjunto de etapas. Não guarda estado de execução.
 * @typedef {Object} Batch
 * @property {string} id
 * @property {string} name
 * @property {string} style
 * @property {string} yeast
 * @property {BatchStage[]} stages
 */

/**
 * Execução em andamento (só um lote roda por vez: há uma única câmara).
 * @typedef {Object} Run
 * @property {string} batchId
 * @property {number} startedAt       ms (Date.now)
 * @property {number} stageIndex
 * @property {number} stageStartedAt  ms
 */

/**
 * @typedef {Object} Telemetry
 * @property {number} setpoint
 * @property {number} chamber
 * @property {number|null} ambient   null quando o NTC está ausente
 * @property {boolean} heating
 * @property {boolean} cooling
 * @property {number} at             ms
 */

/**
 * @typedef {Object} DeviceConfig
 * @property {number} setpoint
 * @property {number} hysteresis
 * @property {number|null} minCycleMin
 */

/**
 * @typedef {Object} HistoryPoint
 * @property {number} t
 * @property {number} actual
 * @property {number} setpoint
 * @property {number|null} ambient
 */

/**
 * @typedef {Object} LogEntry
 * @property {number} id
 * @property {number} at
 * @property {string} event
 * @property {string} value
 * @property {"info"|"warning"|"critical"} severity
 */

/**
 * @typedef {Object} Settings
 * @property {number} hysteresis   °C (delta T)
 * @property {number} minCycleMin  minutos entre mudanças do arrefecimento (0 = sem limite)
 * @property {boolean} alerts
 * @property {"C"|"F"} unit      unidade de exibição da temperatura
 * @property {"live"|"dev"} mode   live = placa real, dev = simulador
 */

export {}
