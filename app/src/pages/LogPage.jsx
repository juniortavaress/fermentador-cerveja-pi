import { useState } from "react"
import { formatDateTime } from "../domain/format.js"
import { Card, Segmented } from "../ui/primitives.jsx"

const SEVERITY_COLOR = { info: "#2563EB", warning: "#F59E0B", critical: "#DC2626" }

export default function LogPage({ f }) {
  const [filter, setFilter] = useState("all")
  const entries = [...f.log].reverse().filter((e) => filter === "all" || e.severity !== "info")

  return (
    <>
      <Segmented options={[["all", "Tudo"], ["alerts", "Só alertas"]]} value={filter} onChange={setFilter} />
      <Card className="flush">
        {entries.length === 0 && (
          <p className="empty">{filter === "all" ? "Nada registrado ainda. Os acontecimentos aparecem aqui." : "Nenhum alerta. Tudo certo!"}</p>
        )}
        {entries.map((e) => (
          <div className="event" key={e.id}>
            <span className="dot" style={{ background: SEVERITY_COLOR[e.severity] }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>{e.event}</p>
              <p className="small">{e.value}</p>
            </div>
            <span className="small" style={{ flexShrink: 0 }}>
              {formatDateTime(e.at)}
            </span>
          </div>
        ))}
      </Card>
    </>
  )
}
