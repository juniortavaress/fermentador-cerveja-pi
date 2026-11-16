// Estado central do app: liga o transporte (placa), o motor de etapas, o log e o histórico.
// As páginas só recebem o objeto retornado e desenham; não falam com a placa diretamente.
import { useCallback, useEffect, useRef, useState } from "react"
import { createTransport, isSerialSupported } from "../transport/index.js"
import { encodeCommand, parseLine } from "../domain/protocol.js"
import {
  advanceRun,
  deviationOnSetpointChange,
  evaluateDeviation,
  initialDeviation,
  runSetpoint,
  skipStage,
  startRun,
} from "../domain/engine.js"
import { formatDuration, formatTemp } from "../domain/format.js"
import { usePersistentState } from "./usePersistentState.js"
import {
  ALERT_GRACE_MS,
  ALERT_THRESHOLD,
  DEFAULT_BATCHES,
  DEFAULT_SETTINGS,
  HISTORY_INTERVAL_MS,
  HISTORY_MAX_MS,
  LOG_MAX,
  STALE_MS,
} from "./defaults.js"

const KEY = "fermentador."
const transportKindFor = (mode) => (mode === "dev" ? "simulator" : "serial")

export function useFermenter() {
  const [storedSettings, setSettings] = usePersistentState(KEY + "settings", DEFAULT_SETTINGS)
  const settings = { ...DEFAULT_SETTINGS, ...storedSettings }
  const [batches, setBatches] = usePersistentState(KEY + "batches", DEFAULT_BATCHES)
  const [selectedId, setSelectedId] = usePersistentState(KEY + "selected", DEFAULT_BATCHES[0].id)
  const [run, setRun] = usePersistentState(KEY + "run", null)
  const [manualSp, setManualSp] = usePersistentState(KEY + "manualSp", null)
  const [log, setLog] = usePersistentState(KEY + "log", [])
  const [history, setHistory] = usePersistentState(KEY + "history", [])

  const [status, setStatus] = useState("disconnected")
  const [statusDetail, setStatusDetail] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [stale, setStale] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Último valor de cada estado, para os callbacks do transporte (que vivem fora do ciclo de render).
  const live = useRef({})
  live.current = { settings, batches, run, manualSp, status }

  const transportRef = useRef(null)
  const unsubsRef = useRef([])
  const connectingRef = useRef(false)
  const wasConnectedRef = useRef(false)
  const lastSeenRef = useRef(0)
  const staleRef = useRef(false)
  const lastHistoryAtRef = useRef(0)
  const lastSpSentRef = useRef(0)
  const lastSpValueRef = useRef(null)
  const lastCfgSentRef = useRef(0)
  const prevSetpointRef = useRef(null)
  const actuatorsRef = useRef(null)
  const deviationRef = useRef(initialDeviation)

  /** Atualiza a execução e já deixa `live` em dia: os callbacks do transporte não esperam o próximo render. */
  const commitRun = useCallback((next) => {
    live.current = { ...live.current, run: next }
    setRun(next)
  }, [setRun])

  // ── Log ──────────────────────────────────────────────────────────────────
  const addLog = useCallback((event, value, severity = "info", at = Date.now()) => {
    setLog((cur) => {
      const id = (cur.length ? cur[cur.length - 1].id : 0) + 1
      return [...cur, { id, at, event, value, severity }].slice(-LOG_MAX)
    })
  }, [setLog])

  // ── Envio de comandos ────────────────────────────────────────────────────
  const send = useCallback(async (cmd) => {
    const t = transportRef.current
    if (!t) return
    try {
      await t.send(encodeCommand(cmd))
    } catch {
      /* conexão caiu: o status do transporte avisa */
    }
  }, [])

  /** Set point que o app quer ver na placa agora (null = não mexer). */
  const desiredSetpoint = () => {
    const L = live.current
    if (L.run) {
      const batch = L.batches.find((b) => b.id === L.run.batchId)
      const sp = batch ? runSetpoint(L.run, batch) : null
      return sp === null ? null : Math.round(sp * 10) / 10
    }
    return L.manualSp === null ? null : Math.round(L.manualSp * 10) / 10
  }

  // ── Mensagens da placa ───────────────────────────────────────────────────
  const handleTelemetry = useCallback((msg) => {
    const at = Date.now()
    const t = { ...msg, at }
    delete t.kind
    lastSeenRef.current = at
    if (staleRef.current) {
      staleRef.current = false
      setStale(false)
      addLog("Dados restabelecidos", "O dispositivo voltou a enviar leituras", "info")
    }
    setTelemetry(t)

    // Histórico: um ponto por minuto
    if (at - lastHistoryAtRef.current >= HISTORY_INTERVAL_MS) {
      lastHistoryAtRef.current = at
      setHistory((h) => [
        ...h.filter((p) => at - p.t <= HISTORY_MAX_MS),
        { t: at, actual: t.chamber, setpoint: t.setpoint, ambient: t.ambient },
      ])
    }

    // Resistência / Peltier: registra ao desligar, com a duração
    const prev = actuatorsRef.current ?? {
      heating: { on: false, since: at },
      cooling: { on: false, since: at },
    }
    const next = { ...prev }
    for (const [key, label] of [
      ["heating", "Resistência acionada"],
      ["cooling", "Peltier acionado"],
    ]) {
      if (t[key] && !prev[key].on) next[key] = { on: true, since: at }
      if (!t[key] && prev[key].on) {
        addLog(label, `Duração: ${formatDuration(at - prev[key].since)}`, "info", at)
        next[key] = { on: false, since: at }
      }
    }
    actuatorsRef.current = next

    // Mudança de set point: registra e dá carência ao alerta de desvio
    if (prevSetpointRef.current === null || prevSetpointRef.current !== t.setpoint) {
      if (prevSetpointRef.current !== null) {
        addLog(
          "Setpoint ajustado",
          `${formatTemp(prevSetpointRef.current)} → ${formatTemp(t.setpoint)} °C`,
          "info",
          at,
        )
      }
      deviationRef.current = deviationOnSetpointChange(deviationRef.current, at, ALERT_GRACE_MS)
      prevSetpointRef.current = t.setpoint
    }

    // Alerta de desvio (uma entrada por excursão)
    if (live.current.settings.alerts) {
      const dev = t.chamber - t.setpoint
      const r = evaluateDeviation(deviationRef.current, dev, at, ALERT_THRESHOLD)
      deviationRef.current = r.state
      if (r.event === "start") {
        addLog(
          "Desvio de temperatura",
          `${dev > 0 ? "+" : "−"}${formatTemp(Math.abs(dev))} °C ${dev > 0 ? "acima" : "abaixo"} do SP`,
          "warning",
          at,
        )
      } else if (r.event === "end") {
        addLog("Temperatura normalizada", `${dev > 0 ? "+" : "−"}${formatTemp(Math.abs(dev))} °C do SP`, "info", at)
      }
    }

    // Garante que a placa está com o set point que o app quer
    const want = desiredSetpoint()
    // (valor novo: envia na hora; mesmo valor sem efeito: só reenvia a cada 3 s)
    if (
      want !== null &&
      Math.abs(t.setpoint - want) > 0.05 &&
      (want !== lastSpValueRef.current || at - lastSpSentRef.current > 3000)
    ) {
      lastSpSentRef.current = at
      lastSpValueRef.current = want
      send({ type: "sp", value: want })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, send, setHistory])

  const handleConfig = useCallback((config) => {
    const at = Date.now()
    const s = live.current.settings
    if (at - lastCfgSentRef.current <= 3000) return
    let sent = false
    if (Math.abs(config.hysteresis - s.hysteresis) > 0.05) {
      send({ type: "hyst", value: s.hysteresis })
      sent = true
    }
    if (config.minCycleMin !== null && Math.abs(config.minCycleMin - s.minCycleMin) > 0.05) {
      send({ type: "minCycle", value: s.minCycleMin })
      sent = true
    }
    if (sent) lastCfgSentRef.current = at
  }, [send])

  const handleLine = useCallback((raw) => {
    const msg = parseLine(raw)
    if (!msg) return
    if (msg.kind === "telemetry") handleTelemetry(msg)
    else if (msg.kind === "config") handleConfig(msg.config)
  }, [handleTelemetry, handleConfig])

  const handleStatus = useCallback((s, detail) => {
    setStatus(s)
    setStatusDetail(detail ?? null)
    if (s === "connected") {
      wasConnectedRef.current = true
      lastSeenRef.current = Date.now()
      actuatorsRef.current = null
      prevSetpointRef.current = null
      const kind = transportRef.current?.kind === "simulator" ? "simulador" : "USB"
      addLog("Dispositivo conectado", kind, "info")
      // A placa pode ter reiniciado ao abrir a porta; pede a configuração depois que ela subir.
      setTimeout(() => send({ type: "getConfig" }), 2500)
    } else if (s === "disconnected") {
      if (wasConnectedRef.current) {
        addLog("Dispositivo desconectado", detail ?? "Conexão encerrada", detail ? "critical" : "warning")
      }
      wasConnectedRef.current = false
      setTelemetry(null)
      staleRef.current = false
      setStale(false)
    } else if (s === "error") {
      addLog("Falha na conexão", detail ?? "Erro desconhecido", "warning")
    }
  }, [addLog, send])

  // ── Conexão ──────────────────────────────────────────────────────────────
  const ensureTransport = useCallback(() => {
    const kind = transportKindFor(live.current.settings.mode)
    if (transportRef.current?.kind === kind) return transportRef.current
    unsubsRef.current.forEach((u) => u())
    const t = createTransport(live.current.settings.mode)
    unsubsRef.current = [t.onLine(handleLine), t.onStatus(handleStatus)]
    transportRef.current = t
    return t
  }, [handleLine, handleStatus])

  const connect = useCallback(async (opts = {}) => {
    if (connectingRef.current || live.current.status === "connected") return
    connectingRef.current = true
    try {
      await ensureTransport().connect(opts)
    } finally {
      connectingRef.current = false
    }
  }, [ensureTransport])

  const disconnect = useCallback(async () => {
    await transportRef.current?.disconnect()
  }, [])

  const setMode = useCallback(async (mode) => {
    if (live.current.settings.mode === mode) return
    await transportRef.current?.disconnect()
    unsubsRef.current.forEach((u) => u())
    unsubsRef.current = []
    transportRef.current = null
    setSettings((s) => ({ ...s, mode }))
  }, [setSettings])

  // Reconecta sozinho ao abrir o app (porta já autorizada / simulador).
  useEffect(() => {
    const mode = live.current.settings.mode
    if (mode === "dev" || isSerialSupported()) connect({ auto: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Troca o transporte quando o modo muda (Live <-> Developer)
  useEffect(() => {
    if (status === "disconnected" && transportRef.current === null) {
      if (settings.mode === "dev" || isSerialSupported()) connect({ auto: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode])

  // ── Relógio: avança etapas e detecta falta de dados ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)

      const L = live.current
      if (L.run) {
        const batch = L.batches.find((b) => b.id === L.run.batchId)
        if (!batch) {
          commitRun(null)
        } else {
          const { run: next, events } = advanceRun(L.run, batch, t)
          if (events.length) {
            commitRun(next)
            for (const e of events) {
              if (e.type === "stage") {
                const from = batch.stages[e.fromIndex]
                const to = batch.stages[e.toIndex]
                addLog(`Etapa: ${to.name}`, `${from.name} → ${to.name} · ${formatTemp(to.temp)} °C`, "info", e.at)
              } else {
                addLog("Fermentação concluída", batch.name, "info", e.at)
              }
            }
          }
        }
      }

      if (L.status === "connected" && !staleRef.current && t - lastSeenRef.current > STALE_MS) {
        staleRef.current = true
        setStale(true)
        addLog("Sem dados do dispositivo", `Nenhuma leitura há mais de ${STALE_MS / 1000} s`, "critical")
      }
    }, 1000)
    return () => clearInterval(id)
  }, [addLog, commitRun])

  // Envia delta T e ciclo mínimo à placa quando o usuário muda (com pausa para o slider).
  useEffect(() => {
    if (status !== "connected") return
    const id = setTimeout(() => {
      lastCfgSentRef.current = Date.now()
      send({ type: "hyst", value: settings.hysteresis })
      send({ type: "minCycle", value: settings.minCycleMin })
    }, 400)
    return () => clearTimeout(id)
  }, [settings.hysteresis, settings.minCycleMin, status, send])

  // ── Ações do usuário ─────────────────────────────────────────────────────
  const selectedBatch = batches.find((b) => b.id === selectedId) ?? batches[0] ?? null
  const runBatch = run ? batches.find((b) => b.id === run.batchId) ?? null : null

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), [setSettings])

  const startBatch = useCallback((id) => {
    const L = live.current
    const batch = L.batches.find((b) => b.id === id)
    if (!batch || L.run || L.status !== "connected") return
    const first = batch.stages[0]
    commitRun(startRun(batch, Date.now()))
    live.current = { ...live.current, manualSp: null }
    setManualSp(null) // o lote assume o set point
    addLog("Fermentação iniciada", `${batch.name} · ${first.name} a ${formatTemp(first.temp)} °C`, "info")
  }, [addLog, commitRun, setManualSp])

  const stopBatch = useCallback(() => {
    const L = live.current
    if (!L.run) return
    const batch = L.batches.find((b) => b.id === L.run.batchId)
    const stage = batch?.stages[L.run.stageIndex]
    commitRun(null)
    addLog("Fermentação interrompida", `${batch?.name ?? "Lote"}${stage ? ` · etapa ${stage.name}` : ""}`, "warning")
  }, [addLog, commitRun])

  const skipCurrentStage = useCallback(() => {
    const L = live.current
    if (!L.run) return
    const batch = L.batches.find((b) => b.id === L.run.batchId)
    if (!batch) return
    const { run: next, events } = skipStage(L.run, batch, Date.now())
    commitRun(next)
    for (const e of events) {
      if (e.type === "stage") {
        const from = batch.stages[e.fromIndex]
        const to = batch.stages[e.toIndex]
        addLog(`Etapa: ${to.name}`, `${from.name} → ${to.name} · ${formatTemp(to.temp)} °C (pulada)`, "info", e.at)
      } else {
        addLog("Fermentação concluída", batch.name, "info", e.at)
      }
    }
  }, [addLog, commitRun])

  /** Set point manual: só vale sem fermentação em andamento (senão a etapa manda). */
  const setManualSetpoint = useCallback((value) => {
    if (live.current.run) return
    const v = Math.min(30, Math.max(0, Math.round(value * 10) / 10))
    live.current = { ...live.current, manualSp: v }
    setManualSp(v)
    if (live.current.status === "connected") {
      lastSpSentRef.current = Date.now()
      lastSpValueRef.current = v
      send({ type: "sp", value: v })
    }
  }, [send, setManualSp])

  const createBatch = useCallback((data) => {
    const batch = { ...data, id: `lote-${Date.now()}` }
    setBatches((cur) => [...cur, batch])
    setSelectedId(batch.id)
    addLog("Lote criado", `${batch.name} · ${batch.stages.length} etapas`, "info")
    return batch
  }, [addLog, setBatches, setSelectedId])

  const deleteBatch = useCallback((id) => {
    const L = live.current
    if (L.run?.batchId === id) return
    const batch = L.batches.find((b) => b.id === id)
    const rest = L.batches.filter((b) => b.id !== id)
    setBatches(rest)
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null)
    if (batch) addLog("Lote removido", batch.name, "info")
  }, [addLog, selectedId, setBatches, setSelectedId])

  return {
    // conexão
    status,
    statusDetail,
    stale,
    serialSupported: isSerialSupported(),
    connect,
    disconnect,
    setMode,
    // dados da placa
    telemetry,
    history,
    log,
    now,
    // configurações
    settings,
    updateSettings,
    // lotes
    batches,
    selectedBatch,
    runBatch,
    run,
    manualSp,
    selectBatch: setSelectedId,
    startBatch,
    stopBatch,
    skipCurrentStage,
    setManualSetpoint,
    createBatch,
    deleteBatch,
  }
}
