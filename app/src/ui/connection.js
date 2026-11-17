/** Estado da conexão em palavras simples, para o cabeçalho, o Início e os Ajustes. */
export function connectionInfo(f) {
  if (f.status === "connected") {
    return f.stale
      ? { text: "Sem dados", tone: "warn", hint: "Sem leituras da placa." }
      : { text: "Conectado", tone: "ok", hint: "Placa conectada." }
  }
  if (f.status === "connecting") return { text: "Conectando…", tone: "warn", hint: "Conectando à placa." }
  if (f.status === "error") return { text: "Erro", tone: "warn", hint: "Falha ao conectar." }
  return { text: "Desconectado", tone: "off", hint: "Placa desconectada." }
}

/** Texto do que a placa está fazendo agora (resfriando, aquecendo, mantendo). */
export function activityInfo(telemetry) {
  if (!telemetry) return null
  if (telemetry.active === false) return { text: "Em espera", tone: "" }
  if (telemetry.cooling) return { text: "Resfriando", tone: "blue" }
  if (telemetry.heating) return { text: "Aquecendo", tone: "amber" }
  const dev = Math.abs(telemetry.chamber - telemetry.setpoint)
  return dev <= 0.5 ? { text: "Na temperatura certa", tone: "green" } : { text: "Aguardando ajustar", tone: "amber" }
}
