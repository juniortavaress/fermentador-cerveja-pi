import { useState } from "react"
import { runSetpoint, stageRemainingMs, totalHours } from "../domain/engine.js"
import { formatDate, formatDuration, formatTemp } from "../domain/format.js"
import { Card, SectionLabel, SetpointDial } from "../ui/primitives.jsx"

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 7,
  border: "1px solid #D1D5DB",
  fontSize: 12,
  color: "#20242B",
}

// ── Formulário de novo lote ─────────────────────────────────────────────────
const newStage = () => ({ name: "", durationHours: "24", temp: "18" })

function NewBatchForm({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [style, setStyle] = useState("")
  const [yeast, setYeast] = useState("")
  const [stages, setStages] = useState([{ name: "Fermentação", durationHours: "72", temp: "18" }])
  const [error, setError] = useState("")

  const updateStage = (index, field, value) =>
    setStages((cur) => cur.map((s, i) => (i === index ? { ...s, [field]: value } : s)))

  const submit = (e) => {
    e.preventDefault()
    const parsed = stages.map((s) => ({
      name: s.name.trim(),
      durationHours: Number(s.durationHours),
      temp: Number(s.temp),
    }))
    const bad = parsed.findIndex(
      (s) => !s.name || !(s.durationHours > 0) || Number.isNaN(s.temp) || s.temp < 0 || s.temp > 30,
    )
    if (bad >= 0) {
      setError(`Etapa ${bad + 1}: informe nome, duração maior que 0 h e temperatura entre 0 e 30 °C.`)
      return
    }
    onCreate({ name: name.trim(), style: style.trim(), yeast: yeast.trim() || "Levedura não informada", stages: parsed })
    setOpen(false)
    setName("")
    setStyle("")
    setYeast("")
    setStages([{ name: "Fermentação", durationHours: "72", temp: "18" }])
    setError("")
  }

  return (
    <Card style={{ overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "#fff", cursor: "pointer", color: "#20242B" }}
      >
        <span style={{ textAlign: "left" }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Criar novo lote</span>
          <span style={{ display: "block", fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Defina etapas, temperaturas e durações</span>
        </span>
        <span style={{ fontSize: 20, color: "#2563EB", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
      </button>

      {open && (
        <form onSubmit={submit} style={{ padding: "14px 16px 16px", borderTop: "1px solid #F3F4F6", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Nome do lote", value: name, set: setName, placeholder: "Ex.: Belgian Ale", required: true },
            { label: "Estilo", value: style, set: setStyle, placeholder: "Ex.: Belgian Ale", required: true },
            { label: "Levedura", value: yeast, set: setYeast, placeholder: "Opcional", required: false },
          ].map((field) => (
            <label key={field.label} style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
              {field.label}
              <input
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          ))}

          <p style={{ fontSize: 11, color: "#6B7280", fontWeight: 600, marginTop: 2 }}>Etapas do lote</p>
          {stages.map((stage, index) => (
            <div key={index} style={{ padding: 10, background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase" }}>Etapa {index + 1}</span>
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setStages((cur) => cur.filter((_, i) => i !== index))}
                    style={{ border: "none", background: "none", color: "#DC2626", cursor: "pointer", fontSize: 11 }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <input
                aria-label={`Nome da etapa ${index + 1}`}
                value={stage.name}
                onChange={(e) => updateStage(index, "name", e.target.value)}
                placeholder="Nome da etapa"
                required
                style={{ ...inputStyle, padding: "8px 9px", marginBottom: 7 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <label style={{ fontSize: 10, color: "#9CA3AF" }}>
                  Temperatura °C
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="30"
                    step="0.5"
                    value={stage.temp}
                    onChange={(e) => updateStage(index, "temp", e.target.value)}
                    style={{ ...inputStyle, marginTop: 3, padding: "7px 8px" }}
                  />
                </label>
                <label style={{ fontSize: 10, color: "#9CA3AF" }}>
                  Duração (h)
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0.1"
                    step="any"
                    value={stage.durationHours}
                    onChange={(e) => updateStage(index, "durationHours", e.target.value)}
                    style={{ ...inputStyle, marginTop: 3, padding: "7px 8px" }}
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setStages((cur) => [...cur, newStage()])}
            style={{ padding: 9, border: "1px dashed #93C5FD", borderRadius: 7, background: "#EFF6FF", color: "#1D4ED8", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
          >
            + Adicionar etapa
          </button>

          {error && <p style={{ fontSize: 11, color: "#DC2626" }}>{error}</p>}

          <button type="submit" style={{ padding: 10, border: "none", borderRadius: 7, background: "#2563EB", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Criar lote
          </button>
        </form>
      )}
    </Card>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function BatchPage({ f, askConfirm }) {
  const { batches, selectedBatch: batch, run, runBatch, now } = f
  const runningThis = run !== null && batch !== null && run.batchId === batch.id
  const runningOther = run !== null && !runningThis
  const connected = f.status === "connected"

  const dialValue = run
    ? (runSetpoint(run, runBatch) ?? 0)
    : (f.manualSp ?? f.telemetry?.setpoint ?? 18)

  const statusOf = (i) => {
    if (!runningThis) return "pending"
    return i < run.stageIndex ? "complete" : i === run.stageIndex ? "active" : "pending"
  }

  const requestStop = () =>
    askConfirm({
      title: "Parar a fermentação?",
      message: `“${batch.name}” será interrompida. Para fermentar de novo, ela recomeça pela primeira etapa. A placa continua com o set point atual até você ajustar.`,
      confirmLabel: "Parar",
      onConfirm: f.stopBatch,
    })

  const requestSkip = () => {
    const last = run.stageIndex >= batch.stages.length - 1
    const next = batch.stages[run.stageIndex + 1]
    askConfirm({
      title: last ? "Encerrar a fermentação?" : "Pular etapa atual?",
      message: last
        ? `“${batch.stages[run.stageIndex].name}” é a última etapa. Pular encerra a fermentação.`
        : `A etapa “${batch.stages[run.stageIndex].name}” será encerrada e o lote avançará para “${next.name}”. O setpoint será atualizado automaticamente.`,
      confirmLabel: last ? "Encerrar" : "Pular etapa",
      onConfirm: f.skipCurrentStage,
    })
  }

  const requestDelete = () =>
    askConfirm({
      title: "Apagar este lote?",
      message: `“${batch.name}” será removido da lista. O histórico de temperatura e o registro de eventos não são afetados.`,
      confirmLabel: "Apagar",
      onConfirm: () => f.deleteBatch(batch.id),
    })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Lista de lotes */}
      <Card style={{ padding: "14px 16px" }}>
        <SectionLabel style={{ marginBottom: 10 }}>Lotes</SectionLabel>
        {batches.length === 0 && <p style={{ fontSize: 12, color: "#9CA3AF" }}>Nenhum lote criado ainda.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {batches.map((b) => {
            const selected = batch?.id === b.id
            const isRunning = run?.batchId === b.id
            return (
              <button
                key={b.id}
                onClick={() => f.selectBatch(b.id)}
                aria-pressed={selected}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  border: `1px solid ${selected ? "#2563EB" : "#E5E7EB"}`,
                  background: selected ? "#EFF6FF" : "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: selected ? "#2563EB" : "#20242B" }}>{b.name}</span>
                  <span style={{ display: "block", fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {b.style} · {b.stages.length} etapas · {totalHours(b)} h
                  </span>
                </span>
                {isRunning && (
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: "#DCFCE7", color: "#166534", flexShrink: 0 }}>
                    em andamento
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {batch && (
        <>
          {/* Etapas do lote selecionado */}
          <Card style={{ padding: "14px 16px" }}>
            <SectionLabel style={{ marginBottom: 4 }}>{runningThis ? "Lote em andamento" : "Lote selecionado"}</SectionLabel>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#20242B" }}>{batch.name}</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              {batch.style} · {batch.yeast}
              {runningThis && ` · Iniciado em ${formatDate(run.startedAt)}`}
            </p>
          </Card>

          {batch.stages.map((row, i) => {
            const status = statusOf(i)
            return (
              <Card key={`${row.name}-${i}`} style={{ padding: "14px 16px", borderColor: status === "active" ? "#2563EB" : "#E5E7EB", background: status === "active" ? "#EFF6FF" : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: status === "pending" ? "#F3F4F6" : "#2563EB",
                        border: status === "pending" ? "1.5px dashed #D1D5DB" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {status === "complete" && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}
                      {status === "active" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />}
                      {status === "pending" && <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>{i + 1}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: status === "active" ? "#2563EB" : status === "complete" ? "#374151" : "#6B7280" }}>{row.name}</p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>
                        {row.durationHours} h
                        {status === "active" && ` · restam ${formatDuration(stageRemainingMs(run, batch, now))}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, fontFamily: "JetBrains Mono, monospace", color: status === "active" ? "#2563EB" : "#6B7280" }}>
                      {formatTemp(row.temp)} °C
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: status === "complete" ? "#ECFDF5" : status === "active" ? "#DBEAFE" : "#F3F4F6",
                        color: status === "complete" ? "#065F46" : status === "active" ? "#1D4ED8" : "#9CA3AF",
                      }}
                    >
                      {status === "complete" ? "concluído" : status === "active" ? "ativo" : "pendente"}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Play / Stop / Pular */}
          {runningThis ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={requestStop}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 9, cursor: "pointer", border: "none", background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 600 }}
              >
                ■ Parar
              </button>
              <button
                onClick={requestSkip}
                style={{ flex: 1, padding: "12px 16px", borderRadius: 9, cursor: "pointer", border: "1px solid #FCA5A5", background: "#FFF7F7", color: "#B91C1C", fontSize: 13, fontWeight: 600 }}
              >
                Pular etapa
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => f.startBatch(batch.id)}
                disabled={runningOther || !connected}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: "#16A34A",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: runningOther || !connected ? "not-allowed" : "pointer",
                  opacity: runningOther || !connected ? 0.45 : 1,
                }}
              >
                ▶ Iniciar fermentação
              </button>
              {runningOther && (
                <p style={{ fontSize: 11, color: "#6B7280", marginTop: 6, textAlign: "center" }}>
                  “{runBatch?.name}” está em andamento. Pare-a para iniciar outro lote.
                </p>
              )}
              {!runningOther && !connected && (
                <p style={{ fontSize: 11, color: "#6B7280", marginTop: 6, textAlign: "center" }}>
                  Conecte o dispositivo (aba Config.) para iniciar.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Set point manual */}
      <Card style={{ padding: "20px 16px" }}>
        <SectionLabel style={{ marginBottom: 16, textAlign: "center" }}>
          {run ? "Setpoint da etapa" : "Ajustar Setpoint"}
        </SectionLabel>
        <SetpointDial value={dialValue} onChange={f.setManualSetpoint} disabled={run !== null || !connected} />
        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 12 }}>
          {run
            ? "Com uma fermentação em andamento, o set point segue a etapa."
            : connected
              ? "Ajuste manual, sem fermentação ativa."
              : "Conecte o dispositivo para ajustar."}
        </p>
      </Card>

      <NewBatchForm onCreate={f.createBatch} />

      {batch && (
        <button
          onClick={requestDelete}
          disabled={runningThis}
          style={{ border: "none", background: "none", color: runningThis ? "#D1D5DB" : "#DC2626", fontSize: 12, cursor: runningThis ? "not-allowed" : "pointer", padding: 8 }}
        >
          Apagar “{batch.name}”
        </button>
      )}
    </div>
  )
}
