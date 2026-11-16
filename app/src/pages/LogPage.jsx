import { useState } from "react"
import { formatDateTime } from "../domain/format.js"
import { Card, FilterChips } from "../ui/primitives.jsx"

const SEVERITY_COLOR = { info: "#2563EB", warning: "#F59E0B", critical: "#DC2626" }

export default function LogPage({ f }) {
  const [filter, setFilter] = useState("all")
  const entries = [...f.log].reverse().filter((e) => filter === "all" || e.severity !== "info")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <FilterChips options={[["all", "Todos os eventos"], ["alerts", "Alertas"]]} value={filter} onChange={setFilter} />

      {entries.length === 0 && (
        <Card style={{ padding: "20px 16px" }}>
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>
            {filter === "all" ? "Nenhum evento registrado ainda." : "Nenhum alerta."}
          </p>
        </Card>
      )}

      {entries.map((entry) => (
        <Card key={entry.id} style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_COLOR[entry.severity], flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#20242B" }}>{entry.event}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 1, fontFamily: "JetBrains Mono, monospace" }}>{entry.value}</p>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "JetBrains Mono, monospace", flexShrink: 0, marginLeft: 8 }}>
              {formatDateTime(entry.at)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
