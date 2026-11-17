import { useState } from "react"
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { downsample, sliceRange, stats } from "../domain/chart.js"
import { convertPoints, fmtTemp } from "../domain/units.js"
import { Card, ChartTooltip, Segmented } from "../ui/primitives.jsx"
import RunsPage from "./RunsPage.jsx"

const HOUR = 3_600_000
const RANGES = { "1m": 60_000, "1h": HOUR, "24h": 24 * HOUR, all: null }

function LiveTemperature({ f }) {
  const [range, setRange] = useState("1m")
  const unit = f.settings.unit
  // O alvo só existe com fermentação em andamento (e só do início dela em diante).
  const { run, runBatch } = f
  const running = run !== null && runBatch !== null
  const stageTemp = running ? runBatch.stages[run.stageIndex].temp : null
  const data = sliceRange(f.history, f.now, RANGES[range])
  const chartData = convertPoints(downsample(data), unit).map((p) => ({
    ...p,
    setpoint: running && p.t >= run.startedAt ? p.setpoint : undefined,
  }))
  const s = stats(data)
  const fmt = (v) => (v == null ? "—" : `${fmtTemp(v, unit)} °${unit}`)

  return (
    <>
      <Segmented options={[["1m", "1 min"], ["1h", "1 hora"], ["24h", "24 h"], ["all", "Tudo"]]} value={range} onChange={setRange} />

      <Card>
        {chartData.length < 2 ? (
          <p className="empty">Ainda não há leituras suficientes. Deixe a placa conectada: o app guarda um ponto por segundo.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart accessibilityLayer={false} data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F2F4" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} hide />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit={unit} />} />
              {running && <Line type="stepAfter" dataKey="setpoint" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Alvo" isAnimationActive={false} />}
              <Area type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} fill="url(#grad)" dot={false} name="Câmara" isAnimationActive={false} />
              <Line type="monotone" dataKey="ambient" stroke="#9CA3AF" strokeWidth={1.5} dot={false} name="Ambiente" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="stat-grid">
        {[
          ["Mais fria", fmt(s?.min)],
          ["Mais quente", fmt(s?.max)],
          ["Média", fmt(s?.avg)],
          ...(running ? [["Alvo da etapa", fmt(stageTemp)]] : []),
        ].map(([label, value], i, all) => (
          <div className="stat" key={label} style={all.length % 2 === 1 && i === all.length - 1 ? { gridColumn: "span 2" } : undefined}>
            <p className="small">{label}</p>
            <b>{value}</b>
          </div>
        ))}
      </div>
    </>
  )
}

export default function TemperaturePage({ f, askConfirm }) {
  const [view, setView] = useState("live")
  const [runsKey, setRunsKey] = useState(0) // tocar em "Fermentações" de novo volta para a lista
  return (
    <>
      <Segmented
        options={[["live", "Ao vivo"], ["runs", "Fermentações"]]}
        value={view}
        onChange={(id) => {
          if (id === "runs") setRunsKey((k) => k + 1)
          setView(id)
        }}
      />
      {view === "live" ? <LiveTemperature f={f} /> : <RunsPage key={runsKey} f={f} askConfirm={askConfirm} />}
    </>
  )
}
