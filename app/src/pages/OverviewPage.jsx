import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { downsample, sliceRange, stats } from "../domain/chart.js"
import { stageFraction, stageRemainingMs, totalHours } from "../domain/engine.js"
import { formatClock, formatDate, formatDuration, formatTemp } from "../domain/format.js"
import { Card, ChartTooltip, SectionLabel, StagePill } from "../ui/primitives.jsx"

const DAY_MS = 24 * 3_600_000

function ConnectionBanner({ f }) {
  if (f.status === "connected") return null
  const live = f.settings.mode === "live"
  let text = "Dispositivo desconectado. Conecte para ver as leituras e iniciar uma fermentação."
  if (f.status === "connecting") text = "Conectando ao dispositivo…"
  else if (live && !f.serialSupported) text = "Este navegador não suporta USB Serial. Abra no Chrome ou no Edge."
  else if (f.statusDetail) text = f.statusDetail

  return (
    <Card style={{ padding: "12px 14px", borderColor: "#FDE68A", background: "#FFFBEB" }}>
      <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.45 }}>{text}</p>
      {f.status !== "connecting" && (live ? f.serialSupported : true) && (
        <button
          onClick={() => f.connect()}
          style={{ marginTop: 10, padding: "8px 14px", border: "none", borderRadius: 7, background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Conectar
        </button>
      )}
    </Card>
  )
}

export default function OverviewPage({ f }) {
  const t = f.telemetry
  const { run, runBatch, now } = f
  const running = run !== null && runBatch !== null
  const batch = running ? runBatch : f.selectedBatch
  const stage = running ? runBatch.stages[run.stageIndex] : null
  const nextStage = running ? runBatch.stages[run.stageIndex + 1] : null

  const setpoint = t?.setpoint ?? (running ? stage.temp : f.manualSp)
  const deviation = t ? +(t.chamber - t.setpoint).toFixed(2) : null
  const devColor =
    deviation === null ? "#9CA3AF" : Math.abs(deviation) > 0.5 ? "#DC2626" : Math.abs(deviation) > 0.2 ? "#F59E0B" : "#16A34A"

  const recent = sliceRange(f.history, now, DAY_MS)
  const chartData = downsample(recent)
  const s = stats(recent)
  const dash = "—"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ConnectionBanner f={f} />

      {/* Temperatura da câmara + set point */}
      <Card style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <SectionLabel>Câmara</SectionLabel>
            <p style={{ fontSize: 48, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#20242B", lineHeight: 1 }}>
              {t ? t.chamber.toFixed(2) : dash}
              <span style={{ fontSize: 18, fontWeight: 400, color: "#9CA3AF", marginLeft: 4 }}>°C</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <StagePill stage={running ? stage.name : "Parado"} muted={!running} />
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
              {running ? `restam ${formatDuration(stageRemainingMs(run, runBatch, now))}` : "Sem fermentação ativa"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: devColor, display: "inline-block" }} />
            <span style={{ fontSize: 12, color: devColor, fontWeight: 500 }}>
              {deviation === null ? "Sem leitura" : `${deviation > 0 ? "+" : ""}${deviation.toFixed(2)} °C desvio`}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            SP:{" "}
            <span style={{ color: "#2563EB", fontWeight: 600 }}>
              {setpoint == null ? dash : `${setpoint.toFixed(1)} °C`}
            </span>
          </span>
        </div>
      </Card>

      {/* Lote + progresso das etapas */}
      {batch ? (
        <Card style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionLabel>{running ? "Lote em andamento" : "Lote selecionado"}</SectionLabel>
            <select
              aria-label="Selecionar lote"
              value={batch.id}
              disabled={running}
              onChange={(e) => f.selectBatch(e.target.value)}
              style={{ maxWidth: 155, padding: "5px 8px", border: "1px solid #D1D5DB", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 11, fontWeight: 600 }}
            >
              {f.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#20242B" }}>{batch.name}</p>
              <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                {batch.style} · {batch.yeast}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#9CA3AF" }}>Início</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{running ? formatDate(run.startedAt) : dash}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Etapa atual", value: running ? stage.name : dash, color: running ? "#2563EB" : undefined },
              { label: "Próxima etapa", value: running ? (nextStage?.name ?? "Última etapa") : dash },
              { label: "Duração total", value: `${totalHours(batch)} h` },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", border: "1px solid #E5E7EB", minWidth: 0 }}>
                <p style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: item.color ?? "#20242B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "#F3F4F6", marginBottom: 12 }} />

          <SectionLabel style={{ marginBottom: 8 }}>Progresso da Fermentação</SectionLabel>
          <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
            {batch.stages.map((st, i) => {
              const done = running && i < run.stageIndex
              const active = running && i === run.stageIndex
              const fraction = active ? stageFraction(run, runBatch, now) : 0
              return (
                <div key={`${st.name}-${i}`} style={{ flex: 1, height: 4, borderRadius: 2, background: done ? "#2563EB" : active ? "#BFDBFE" : "#E5E7EB", overflow: "hidden" }}>
                  {active && <div style={{ width: `${fraction * 100}%`, height: "100%", background: "#2563EB" }} />}
                </div>
              )
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {batch.stages.map((st, i) => {
              const done = running && i < run.stageIndex
              const active = running && i === run.stageIndex
              return (
                <div key={`${st.name}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 9, color: done || active ? "#2563EB" : "#D1D5DB", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {st.name.slice(0, 4)}
                  </span>
                  <span style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", color: active ? "#2563EB" : "#9CA3AF", fontWeight: active ? 600 : 400 }}>
                    {formatTemp(st.temp)} °C
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: 13, color: "#6B7280" }}>Nenhum lote criado. Crie um na aba Lote.</p>
        </Card>
      )}

      {/* Gráfico das últimas 24 h */}
      <Card style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#20242B", marginBottom: 10 }}>Últimas 24 h</p>
        {chartData.length < 2 ? (
          <p style={{ fontSize: 12, color: "#9CA3AF", padding: "40px 0", textAlign: "center" }}>
            Aguardando leituras (um ponto por minuto)…
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 2, right: 2, left: -28, bottom: 0 }}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatClock} tickCount={4} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {setpoint != null && <ReferenceLine y={setpoint} stroke="#BFDBFE" strokeDasharray="3 2" strokeWidth={1} />}
              <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={1.5} dot={false} name="Real" isAnimationActive={false} />
              <Line type="stepAfter" dataKey="setpoint" stroke="#BFDBFE" strokeWidth={1} dot={false} strokeDasharray="3 2" name="Setpoint" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Mín / máx / saídas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Temp. mín.", value: s ? `${s.min.toFixed(2)} °C` : dash },
          { label: "Temp. máx.", value: s ? `${s.max.toFixed(2)} °C` : dash },
          { label: "Peltier", value: t ? (t.cooling ? "Resfriando" : "Inativo") : dash },
          { label: "Resistência", value: t ? (t.heating ? "Aquecendo" : "Inativa") : dash },
        ].map((item) => (
          <Card key={item.label} style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#20242B" }}>{item.value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
