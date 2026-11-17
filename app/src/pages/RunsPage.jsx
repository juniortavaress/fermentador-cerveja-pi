import { useState } from "react"
import { Area, AreaChart, CartesianGrid, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { downsample } from "../domain/chart.js"
import { formatDateTime, formatDuration } from "../domain/format.js"
import { stageSummaries, summarize } from "../domain/records.js"
import { convertPoints, fmtDelta, fmtTemp } from "../domain/units.js"
import { Card, ChartTooltip, useEscapeKey } from "../ui/primitives.jsx"

const STATUS = {
  running: { text: "Em andamento", cls: "green" },
  finished: { text: "Concluída", cls: "blue" },
  stopped: { text: "Interrompida", cls: "amber" },
}

const durationOf = (rec, now) => (rec.endedAt ?? now) - rec.startedAt

// ── Detalhe de uma fermentação ──────────────────────────────────────────────
function RunDetail({ rec, f }) {
  const unit = f.settings.unit
  const now = f.now
  const end = rec.endedAt ?? now
  const points = convertPoints(downsample(rec.points, 400), unit)
  const stages = stageSummaries(rec, now)
  const all = summarize(rec.points)
  const fmt = (v) => (v == null ? "—" : `${fmtTemp(v, unit)} °${unit}`)
  const status = STATUS[rec.status]

  return (
    <>
      <div>
        <div className="row">
          <p className="h2" style={{ fontSize: 22 }}>
            {rec.name}
          </p>
          <span className={`pill ${status.cls}`}>{status.text}</span>
        </div>
        <p className="sub" style={{ marginTop: 4 }}>
          {formatDateTime(rec.startedAt)} · durou {formatDuration(durationOf(rec, now))}
        </p>
      </div>

      <Card>
        {points.length < 2 ? (
          <p className="empty">Esta fermentação não registrou leituras (a placa estava desconectada).</p>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart accessibilityLayer={false} data={points} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F2F4" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={[rec.startedAt, end]} hide />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              {stages.map((st) => (
                <ReferenceArea
                  key={st.index}
                  x1={st.startAt}
                  x2={st.endAt}
                  fill={st.index % 2 === 0 ? "#EFF6FF" : "#F8FAFC"}
                  fillOpacity={1}
                  ifOverflow="hidden"
                  label={{ value: String(st.index + 1), position: "insideTop", fontSize: 12, fill: "#6B7280" }}
                />
              ))}
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <Line type="stepAfter" dataKey="setpoint" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Alvo" isAnimationActive={false} />
              <Area type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} fill="url(#runGrad)" dot={false} name="Câmara" isAnimationActive={false} />
              <Line type="monotone" dataKey="ambient" stroke="#9CA3AF" strokeWidth={1.5} dot={false} name="Ambiente" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="stat-grid">
        {[
          ["Mais fria", fmt(all?.min)],
          ["Mais quente", fmt(all?.max)],
          ["Média", fmt(all?.avg)],
          ["Variação", all ? `${fmtDelta(all.max - all.min, unit)} °${unit}` : "—"],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <p className="small">{label}</p>
            <b>{value}</b>
          </div>
        ))}
      </div>

      <Card>
        <p className="label" style={{ marginBottom: 14 }}>
          Etapas
        </p>
        <div className="timeline">
          {stages.map((st) => (
            <div key={st.index} className="step done">
              <div className="bullet">{st.index + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{st.name}</p>
                <p className="sub">
                  Alvo {fmt(st.temp)} · {formatDuration(st.ms)}
                </p>
                <p className="small">
                  {st.stats ? `Média ${fmt(st.stats.avg)} · mín ${fmt(st.stats.min)} · máx ${fmt(st.stats.max)}` : "Sem leituras nesta etapa"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

// ── Lista ───────────────────────────────────────────────────────────────────
export default function RunsPage({ f, askConfirm }) {
  const [openId, setOpenId] = useState(null)
  const [menuId, setMenuId] = useState(null)
  useEscapeKey(() => setMenuId(null))

  const rows = [...(f.activeRecord ? [f.activeRecord] : []), ...[...f.records].reverse()]
  const open = rows.find((r) => r.id === openId)
  if (open) return <RunDetail rec={open} f={f} />

  const menuRec = rows.find((r) => r.id === menuId)
  const remove = () => {
    const rec = menuRec
    setMenuId(null)
    askConfirm({
      title: "Apagar este registro?",
      message: `O histórico de temperatura de “${rec.name}” (${formatDateTime(rec.startedAt)}) será removido. Isso não afeta o lote.`,
      confirmLabel: "Apagar registro",
      onConfirm: () => f.deleteRecord(rec.id),
    })
  }

  if (rows.length === 0) {
    return (
      <Card>
        <p className="empty">Nenhuma fermentação ainda. Quando você iniciar uma, o histórico de temperatura dela fica guardado aqui.</p>
      </Card>
    )
  }

  return (
    <>
      {rows.map((r) => {
        const st = STATUS[r.status]
        const s = summarize(r.points)
        return (
          <div key={r.id} className="batch-item">
            <button className="batch-main" onClick={() => setOpenId(r.id)}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{r.name}</span>
              <span className="small" style={{ display: "block", marginTop: 2 }}>
                {formatDateTime(r.startedAt)} · {formatDuration(durationOf(r, f.now))}
                {s ? ` · ${fmtTemp(s.min, f.settings.unit)} a ${fmtTemp(s.max, f.settings.unit)} °${f.settings.unit}` : ""}
              </span>
              <span className={`pill ${st.cls}`} style={{ marginTop: 8 }}>
                {st.text}
              </span>
            </button>
            {r.status !== "running" && (
              <button className="kebab" aria-label={`Opções do registro ${r.name} ${formatDateTime(r.startedAt)}`} onClick={() => setMenuId(r.id)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#6B7280" aria-hidden="true">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            )}
          </div>
        )
      })}

      {menuRec && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Opções do registro" onClick={() => setMenuId(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn ghost-red" onClick={remove}>
                Apagar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
