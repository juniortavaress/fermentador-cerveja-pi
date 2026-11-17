import { useState } from "react"
import { totalHours } from "../domain/engine.js"
import { formatDuration } from "../domain/format.js"
import { fmtDelta, fmtTemp, fromUnit, toUnit } from "../domain/units.js"
import { Card, useEscapeKey } from "../ui/primitives.jsx"
import { DEFAULT_SETTINGS } from "../state/defaults.js"

const HOUR_MS = 3_600_000
const TEMP_MAX_C = 40 // a placa recusa set point acima disso
const lengthOf = (batch) => formatDuration(totalHours(batch) * HOUR_MS)

// ── Tolerância (vale para a fermentação deste lote) ─────────────────────────
const PRESETS = [
  { id: "precise", label: "Preciso", value: 0.3, hint: "Liga mais vezes" },
  { id: "balanced", label: "Equilibrado", value: 0.5, hint: "Recomendado" },
  { id: "economic", label: "Econômico", value: 1, hint: "Liga menos" },
]

/** Desenho: a faixa azul é onde a temperatura pode andar sem a placa reagir. */
function ToleranceChart({ value, unit }) {
  const mid = 40
  const half = Math.min(36, 8 + value * 8) // a faixa cresce com a tolerância
  const amp = half * 0.6
  const wave = Array.from({ length: 31 }, (_, i) => {
    const x = 10 + i * 9.33
    const y = mid + Math.sin(i * 0.55) * amp * (0.75 + 0.25 * Math.cos(i * 0.21))
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(" ")
  return (
    <svg viewBox="0 0 300 80" role="img" aria-label={`Faixa de tolerância de mais ou menos ${fmtDelta(value, unit)} graus`} style={{ width: "100%", display: "block" }}>
      <rect x="10" y={mid - half} width="280" height={half * 2} rx="6" fill="#DBEAFE" />
      <line x1="10" x2="290" y1={mid} y2={mid} stroke="#2563EB" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={wave} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

function TuningFields({ hysteresis, unit, onChange }) {
  const set = (v) => onChange({ hysteresis: Math.min(5, Math.max(0.1, +v.toFixed(1))) })
  const preset = PRESETS.find((p) => Math.abs(p.value - hysteresis) < 0.001)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row">
        <p className="h2" style={{ fontSize: 16 }}>
          Tolerância
        </p>
        <span className="pill">{preset ? preset.hint : "Personalizada"}</span>
      </div>

      <div className="segmented" role="radiogroup" aria-label="Tolerância pronta">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={preset?.id === p.id} className={preset?.id === p.id ? "on" : ""} onClick={() => set(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      <ToleranceChart value={hysteresis} unit={unit} />

      <div className="stepper">
        <button type="button" aria-label="Diminuir tolerância" disabled={hysteresis <= 0.1} onClick={() => set(hysteresis - 0.1)}>
          −
        </button>
        <p style={{ fontSize: 28, fontWeight: 700, color: "#2563EB", fontVariantNumeric: "tabular-nums" }} aria-live="polite">
          ±{fmtDelta(hysteresis, unit)}
          <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 3 }}>°{unit}</span>
        </p>
        <button type="button" aria-label="Aumentar tolerância" disabled={hysteresis >= 5} onClick={() => set(hysteresis + 0.1)}>
          +
        </button>
      </div>
    </div>
  )
}

// ── Etapas (usadas no lote novo e na edição) ─────────────────────────────────
const tempText = (c, unit) => String(+toUnit(c, unit).toFixed(1))
const DUR_FACTOR = { s: 1 / 3600, min: 1 / 60, h: 1 } // para horas
const DUR_LABEL = { s: "segundos", min: "minutos", h: "horas" }
const newStage = (unit) => ({ name: "", amount: "24", durUnit: "h", temp: tempText(18, unit) })

/** Etapa guardada (°C, horas) -> campos de formulário (unidade da tela, melhor unidade de tempo). */
function toEditable(stage, unit) {
  const sec = Math.round(stage.durationHours * 3600)
  let durUnit = "s"
  let amount = sec
  if (sec % 3600 === 0) { durUnit = "h"; amount = sec / 3600 }
  else if (sec % 60 === 0) { durUnit = "min"; amount = sec / 60 }
  return { name: stage.name, amount: String(amount), durUnit, temp: tempText(stage.temp, unit) }
}

/** Campos de formulário -> etapas para guardar. Devolve { stages } ou { error }. */
function parseStages(rows, unit) {
  const parsed = rows.map((r) => ({
    name: r.name.trim(),
    durationHours: Number(r.amount) * DUR_FACTOR[r.durUnit],
    temp: +fromUnit(Number(r.temp), unit).toFixed(1),
  }))
  const bad = parsed.findIndex((s) => !s.name || !(s.durationHours > 0) || Number.isNaN(s.temp) || s.temp < 0 || s.temp > TEMP_MAX_C)
  if (bad >= 0) {
    return { error: `Etapa ${bad + 1}: preencha o nome, uma duração maior que zero e uma temperatura entre ${fmtTemp(0, unit, 0)} e ${fmtTemp(TEMP_MAX_C, unit, 0)} °${unit} (limite da placa).` }
  }
  return { stages: parsed }
}

function StagesEditor({ stages, setStages, unit }) {
  const update = (index, field, value) => setStages((cur) => cur.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  return (
    <>
      {stages.map((stage, index) => (
        <Card key={index} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="row">
            <p style={{ fontWeight: 700 }}>Etapa {index + 1}</p>
            {stages.length > 1 && (
              <button type="button" className="link-btn danger" onClick={() => setStages((cur) => cur.filter((_, i) => i !== index))}>
                Remover
              </button>
            )}
          </div>
          <label className="field">
            Nome
            <input className="input" aria-label={`Nome da etapa ${index + 1}`} value={stage.name} onChange={(e) => update(index, "name", e.target.value)} placeholder="Ex.: Fermentação" required />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="field">
              Temperatura (°{unit})
              <input className="input" type="number" inputMode="decimal" min={fmtTemp(0, unit, 0).replace(",", ".")} max={fmtTemp(TEMP_MAX_C, unit, 0).replace(",", ".")} step={unit === "F" ? "1" : "0.5"} value={stage.temp} onChange={(e) => update(index, "temp", e.target.value)} />
            </label>
            <div className="field">
              Duração
              <div className="dur">
                <input className="input" aria-label={`Duração da etapa ${index + 1}`} type="number" inputMode="decimal" min="0" step="any" value={stage.amount} onChange={(e) => update(index, "amount", e.target.value)} />
                <select className="input" aria-label={`Unidade de tempo da etapa ${index + 1}`} value={stage.durUnit} onChange={(e) => update(index, "durUnit", e.target.value)}>
                  {Object.entries(DUR_LABEL).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      ))}
      <button type="button" className="btn ghost small-btn" onClick={() => setStages((cur) => [...cur, newStage(unit)])}>
        + Adicionar etapa
      </button>
    </>
  )
}

// ── Novo lote ───────────────────────────────────────────────────────────────
function NewBatchForm({ onCreate, unit }) {
  const [name, setName] = useState("")
  const [style, setStyle] = useState("")
  const [stages, setStages] = useState(() => [{ name: "Fermentação", amount: "72", durUnit: "h", temp: tempText(18, unit) }])
  const [tuning, setTuning] = useState({ hysteresis: DEFAULT_SETTINGS.hysteresis })
  const [error, setError] = useState("")

  const submit = (e) => {
    e.preventDefault()
    const r = parseStages(stages, unit)
    if (r.error) {
      setError(r.error)
      return
    }
    onCreate({ name: name.trim(), style: style.trim() || "Sem estilo", yeast: "Levedura não informada", stages: r.stages, ...tuning })
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <p className="h2" style={{ fontSize: 22 }}>
          Novo lote
        </p>
        <p className="sub" style={{ marginTop: 4 }}>
          Monte a receita em etapas. A placa muda a temperatura sozinha quando cada etapa termina.
        </p>
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="field">
          Nome do lote
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Minha IPA" required />
        </label>
        <label className="field">
          Estilo <small>Opcional</small>
          <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Ex.: American IPA" />
        </label>
      </Card>

      <p className="label" style={{ marginTop: 4 }}>
        Etapas
      </p>
      <StagesEditor stages={stages} setStages={setStages} unit={unit} />

      <Card>
        <TuningFields {...tuning} unit={unit} onChange={(patch) => setTuning((t) => ({ ...t, ...patch }))} />
      </Card>

      {error && (
        <p role="alert" className="small" style={{ color: "#B91C1C" }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn">
        Criar lote
      </button>
    </form>
  )
}

// ── Detalhe do lote ─────────────────────────────────────────────────────────
function BatchDetail({ f, batch, startEditing = false, go }) {
  const { run } = f
  const runningThis = run !== null && run.batchId === batch.id
  const runningOther = run !== null && !runningThis
  const connected = f.status === "connected"
  const unit = f.settings.unit
  const [editing, setEditing] = useState(startEditing && !(f.run && f.run.batchId === batch.id))
  const [draft, setDraft] = useState(() => (startEditing ? batch.stages.map((s) => toEditable(s, f.settings.unit)) : []))
  const [editError, setEditError] = useState("")

  const startEdit = () => {
    setDraft(batch.stages.map((s) => toEditable(s, unit)))
    setEditError("")
    setEditing(true)
  }
  const saveEdit = () => {
    const r = parseStages(draft, unit)
    if (r.error) {
      setEditError(r.error)
      return
    }
    f.updateBatch(batch.id, { stages: r.stages })
    setEditing(false)
  }

  const statusOf = (i) => (!runningThis ? "pending" : i < run.stageIndex ? "done" : i === run.stageIndex ? "active" : "pending")

  const start = () => {
    f.startBatch(batch.id)
    go("home")
  }

  return (
    <>
      <div>
        <p className="h2" style={{ fontSize: 22 }}>
          {batch.name}
        </p>
        <p className="sub" style={{ marginTop: 4 }}>
          {batch.style} · {batch.stages.length} etapas · {lengthOf(batch)} no total
        </p>
      </div>

      {editing ? (
        <>
          <p className="label">Etapas da receita</p>
          <StagesEditor stages={draft} setStages={setDraft} unit={unit} />
          {editError && (
            <p role="alert" className="small" style={{ color: "#B91C1C" }}>
              {editError}
            </p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn ghost small-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="btn small-btn" onClick={saveEdit}>
              Salvar etapas
            </button>
          </div>
        </>
      ) : (
        <Card>
          <div className="row" style={{ marginBottom: 14 }}>
            <p className="label">Etapas da receita</p>
            {!runningThis && (
              <button className="link-btn" style={{ padding: 0, minHeight: 0 }} onClick={startEdit}>
                Editar
              </button>
            )}
          </div>
          <div className="timeline">
            {batch.stages.map((s, i) => {
              const status = statusOf(i)
              return (
                <div key={`${s.name}-${i}`} className={`step ${status}`}>
                  <div className="bullet">{status === "done" ? "✓" : i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: status === "active" ? "#2563EB" : undefined }}>{s.name}</p>
                    <p className="sub">
                      {fmtTemp(s.temp, unit)} °{unit} · {formatDuration(s.durationHours * HOUR_MS)}
                    </p>
                  </div>
                  {status === "active" && <span className="pill blue">agora</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <TuningFields
          hysteresis={batch.hysteresis ?? DEFAULT_SETTINGS.hysteresis}
          unit={f.settings.unit}
          onChange={(patch) => f.updateBatch(batch.id, patch)}
        />
      </Card>

      {runningThis ? (
        <Card className="tint-warn" style={{ background: "#EFF6FF", borderColor: "#BFDBFE" }}>
          <p style={{ fontWeight: 700 }}>Em andamento</p>
          <button className="btn small-btn" style={{ marginTop: 12 }} onClick={() => go("home")}>
            Ver no Início
          </button>
        </Card>
      ) : (
        <div>
          <button className="btn green" onClick={start} disabled={runningOther || !connected}>
            ▶ Iniciar fermentação
          </button>
          {runningOther && (
            <p className="small" style={{ marginTop: 8, textAlign: "center" }}>
              “{f.runBatch?.name}” está em andamento. Pare-a no Início para iniciar outro lote.
            </p>
          )}
          {!runningOther && !connected && (
            <p className="small" style={{ marginTop: 8, textAlign: "center" }}>
              Conecte a placa para iniciar.{" "}
              <button className="link-btn" style={{ padding: 0, minHeight: 0, fontSize: 13 }} onClick={() => go("settings")}>
                Abrir Ajustes
              </button>
            </p>
          )}
        </div>
      )}

    </>
  )
}

// ── Menu de ações do lote (três pontos) ─────────────────────────────────────
function BatchMenu({ f, batch, onClose, onEdit, go, askConfirm }) {
  useEscapeKey(onClose)
  const runningThis = f.run?.batchId === batch.id
  const runningOther = f.run !== null && !runningThis
  const connected = f.status === "connected"
  const canStart = !f.run && connected
  const startHint = runningThis ? null : runningOther ? "Outra fermentação em andamento" : !connected ? "Conecte a placa em Ajustes" : null

  const start = () => {
    f.startBatch(batch.id)
    onClose()
    go("home")
  }
  const remove = () => {
    onClose()
    askConfirm({
      title: "Apagar este lote?",
      message: `“${batch.name}” será removido da lista. O histórico de temperatura e os eventos continuam guardados.`,
      confirmLabel: "Apagar lote",
      onConfirm: () => f.deleteBatch(batch.id),
    })
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Opções de ${batch.name}`} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="h2" style={{ marginBottom: 12 }}>
          {batch.name}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <button className="btn green" disabled={!canStart} onClick={start}>
              ▶ Iniciar fermentação
            </button>
            {startHint && (
              <p className="small" style={{ marginTop: 6, textAlign: "center" }}>
                {startHint}
              </p>
            )}
          </div>
          <button className="btn ghost" disabled={runningThis} onClick={() => { onClose(); onEdit() }}>
            Editar etapas
          </button>
          <button className="btn ghost-red" disabled={runningThis} onClick={remove}>
            Apagar lote
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function BatchPage({ f, go, askConfirm }) {
  const [view, setView] = useState({ name: "list" }) // list | detail | new
  const [menuId, setMenuId] = useState(null) // lote com o menu de três pontos aberto

  if (view.name === "new") {
    return (
      <NewBatchForm
        unit={f.settings.unit}
        onCreate={(data) => {
          const batch = f.createBatch(data)
          setView({ name: "detail", id: batch.id })
        }}
      />
    )
  }

  const detail = view.name === "detail" ? f.batches.find((b) => b.id === view.id) : null
  if (detail) {
    return <BatchDetail key={`${detail.id}-${view.edit ? "e" : "v"}`} f={f} batch={detail} startEditing={!!view.edit} go={go} />
  }

  return (
    <>
      {f.batches.length === 0 && (
        <Card>
          <p className="empty">Você ainda não tem lotes. Toque em “Novo lote” para criar o primeiro.</p>
        </Card>
      )}

      {f.batches.map((b) => {
        const isRunning = f.run?.batchId === b.id
        return (
          <div key={b.id} className="batch-item">
            <button className="batch-main" onClick={() => setView({ name: "detail", id: b.id })}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{b.name}</span>
              <span className="small" style={{ display: "block", marginTop: 2 }}>
                {b.style} · {b.stages.length} etapas · {lengthOf(b)}
              </span>
              {isRunning && (
                <span className="pill green" style={{ marginTop: 8 }}>
                  em andamento
                </span>
              )}
            </button>
            <button className="kebab" aria-label={`Opções de ${b.name}`} aria-haspopup="dialog" onClick={() => setMenuId(b.id)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#6B7280" aria-hidden="true">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        )
      })}

      <button className="btn" onClick={() => setView({ name: "new" })}>
        + Novo lote
      </button>

      {menuId && f.batches.find((b) => b.id === menuId) && (
        <BatchMenu
          f={f}
          batch={f.batches.find((b) => b.id === menuId)}
          go={go}
          askConfirm={askConfirm}
          onClose={() => setMenuId(null)}
          onEdit={() => setView({ name: "detail", id: menuId, edit: true })}
        />
      )}
    </>
  )
}
