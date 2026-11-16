// Protocolo de texto entre app e placa. Espelha firmware/fermentador/protocol.h.
// É independente do transporte: USB Serial hoje, WebSocket/ESP depois.

const CONFIG_RE =
  /Set point:\s*(-?[\d.]+)\s*C\s*\|\s*Histerese:\s*([\d.]+)\s*C(?:\s*\|\s*Ciclo min:\s*([\d.]+)\s*min)?/i

/**
 * Interpreta uma linha vinda da placa. Retorna null para lixo/linha vazia.
 * @returns {{kind:"telemetry", setpoint:number, chamber:number, ambient:number|null, heating:boolean, cooling:boolean}
 *   | {kind:"config", config:import("./types.js").DeviceConfig}
 *   | {kind:"info", text:string}
 *   | null}
 */
export function parseLine(raw) {
  const line = raw.trim()
  if (!line) return null

  if (line.startsWith("#")) {
    const m = line.match(CONFIG_RE)
    if (m) {
      return {
        kind: "config",
        config: {
          setpoint: parseFloat(m[1]),
          hysteresis: parseFloat(m[2]),
          minCycleMin: m[3] !== undefined ? parseFloat(m[3]) : null,
        },
      }
    }
    return { kind: "info", text: line.replace(/^#\s*/, "") }
  }

  const fields = {}
  for (const pair of line.split(",")) {
    const idx = pair.indexOf(":")
    if (idx < 0) return null
    const key = pair.slice(0, idx).trim()
    const value = parseFloat(pair.slice(idx + 1))
    if (!key || Number.isNaN(value)) return null
    fields[key] = value
  }
  if (fields.SP === undefined || fields.Tcaixa === undefined) return null

  // A placa manda Tamb:0 e Rntc_k <= 0 quando o NTC está solto ou em curto.
  const ntcOk = fields.Rntc_k === undefined || fields.Rntc_k > 0
  return {
    kind: "telemetry",
    setpoint: fields.SP,
    chamber: fields.Tcaixa,
    ambient: ntcOk && fields.Tamb !== undefined ? fields.Tamb : null,
    heating: fields.Aquec === 1,
    cooling: fields.Frio === 1,
  }
}

/**
 * Converte um comando em uma linha (sem o \n final).
 * Comandos: {type:"sp"|"hyst"|"minCycle", value:number} ou {type:"getConfig"}
 */
export function encodeCommand(cmd) {
  switch (cmd.type) {
    case "sp":
      return `SP ${cmd.value.toFixed(1)}`
    case "hyst":
      return `H ${cmd.value.toFixed(1)}`
    case "minCycle":
      return `MC ${cmd.value.toFixed(1)}`
    case "getConfig":
      return "?"
    default:
      throw new Error(`Comando desconhecido: ${cmd.type}`)
  }
}
