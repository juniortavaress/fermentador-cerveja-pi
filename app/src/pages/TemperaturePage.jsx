import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { downsample, sliceRange, stats } from "../domain/chart.js"
import { formatClock } from "../domain/format.js"
import { Card, ChartTooltip, FilterChips } from "../ui/primitives.jsx"

const HOUR = 3_600_000
const RANGES = { "24h": 24 * HOUR, "48h": 48 * HOUR, all: null }

export default function TemperaturePage({ f }) {
  const [range, setRange] = useState("48h")
  const setpoint = f.telemetry?.setpoint ?? null
  const data = sliceRange(f.history, f.now, RANGES[range])
  const chartData = downsample(data)
  const s = stats(data)
  const dash = "—"

  const rows = [
    ["Mínimo", s ? `${s.min.toFixed(2)} °C` : dash],
    ["Máximo", s ? `${s.max.toFixed(2)} °C` : dash],
    ["Média", s ? `${s.avg.toFixed(2)} °C` : dash],
    ["Setpoint", setpoint === null ? dash : `${setpoint.toFixed(1)} °C`],
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <FilterChips options={[["24h", "24h"], ["48h", "48h"], ["all", "Tudo"]]} value={range} onChange={setRange} />

      <Card style={{ padding: "14px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#20242B", marginBottom: 12 }}>Temperatura da Câmara</p>
        {chartData.length < 2 ? (
          <p style={{ fontSize: 12, color: "#9CA3AF", padding: "70px 0", textAlign: "center" }}>
            Aguardando leituras (um ponto por minuto)…
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 2, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={formatClock} tickCount={5} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              {setpoint !== null && <ReferenceLine y={setpoint} stroke="#BFDBFE" strokeDasharray="3 2" strokeWidth={1} />}
              <Area type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={1.5} fill="url(#grad)" dot={false} name="Real" isAnimationActive={false} />
              <Line type="monotone" dataKey="ambient" stroke="#9CA3AF" strokeWidth={1} dot={false} name="Ambiente" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {rows.map(([label, value], i) => (
        <Card key={label} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
          <span style={{ fontSize: 15, fontWeight: 600, fontFamily: "JetBrains Mono, monospace", color: i === 3 ? "#2563EB" : "#20242B" }}>
            {value}
          </span>
        </Card>
      ))}
    </div>
  )
}
