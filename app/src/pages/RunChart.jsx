import { useRef, useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { downsample } from "../domain/chart.js"
import { formatDuration } from "../domain/format.js"
import { convertPoints } from "../domain/units.js"
import { Card, ChartTooltip } from "../ui/primitives.jsx"

const WINDOW_MS = 60_000 // o gráfico mostra 1 min por vez; arraste para ver o que passou

/**
 * Gráfico da fermentação em andamento, com a câmara, o ambiente e o alvo.
 * Dá para voltar no tempo arrastando o gráfico para o lado. "Ao vivo" volta ao presente.
 */
export default function RunChart({ f }) {
  const { run, now, activeRecord } = f
  const unit = f.settings.unit
  const [endAt, setEndAt] = useState(null) // null = acompanhando ao vivo; senão, o instante onde a janela termina
  const box = useRef(null)
  const drag = useRef(null)

  const span = Math.max(now - run.startedAt, 1000) // quanto tempo a fermentação já tem
  const W = Math.min(WINDOW_MS, span) // tamanho da janela (nunca maior que a fermentação)
  const minEnd = run.startedAt + W
  const end = endAt === null ? now : Math.min(now, Math.max(minEnd, endAt))
  const live = endAt === null || end >= now - 500

  const all = activeRecord?.points ?? []
  const visible = all.filter((p) => p.t >= end - W && p.t <= end)
  const data = convertPoints(downsample(visible), unit)

  const goTo = (t) => setEndAt(t >= now - 500 ? null : Math.max(minEnd, t))

  const onDown = (e) => {
    drag.current = { x: e.clientX, end }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current) return
    const width = box.current?.getBoundingClientRect().width || 300
    const dt = ((e.clientX - drag.current.x) / width) * W // arrastar para a direita = voltar no tempo
    goTo(drag.current.end - dt)
  }
  const onUp = () => {
    drag.current = null
  }

  return (
    <Card>
      <div className="row" style={{ marginBottom: 12, minHeight: 32 }}>
        <p className="h2" style={{ fontSize: 16 }}>
          Desta fermentação
        </p>
        {!live && (
          <button className="pill blue" style={{ border: "none", cursor: "pointer" }} onClick={() => setEndAt(null)}>
            Ao vivo ›
          </button>
        )}
      </div>

      <div
        ref={box}
        data-testid="run-chart-drag"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ touchAction: "pan-y", cursor: "grab", userSelect: "none" }}
      >
        {data.length < 2 ? (
          <p className="empty" style={{ padding: "24px 0" }}>
            {all.length < 2 ? "Juntando as primeiras leituras…" : "Sem leituras neste trecho"}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={170}>
            <LineChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#F1F2F4" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={[end - W, end]} allowDataOverflow hide />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <Line type="stepAfter" dataKey="setpoint" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Alvo" isAnimationActive={false} />
              <Line type="monotone" dataKey="ambient" stroke="#9CA3AF" strokeWidth={1.5} dot={false} name="Ambiente" isAnimationActive={false} />
              <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Câmara" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {!live && (
        <p className="small" style={{ marginTop: 6, textAlign: "center" }}>
          Voltou {formatDuration(now - end)}
        </p>
      )}
    </Card>
  )
}
