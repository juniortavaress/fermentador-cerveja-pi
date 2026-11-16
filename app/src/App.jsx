import { useState } from "react"
import { useFermenter } from "./state/useFermenter.js"
import { ConfirmDialog } from "./ui/primitives.jsx"
import { IconHome, IconLog, IconSchedule, IconSettings, IconTemp } from "./ui/icons.jsx"
import OverviewPage from "./pages/OverviewPage.jsx"
import TemperaturePage from "./pages/TemperaturePage.jsx"
import LogPage from "./pages/LogPage.jsx"
import BatchPage from "./pages/BatchPage.jsx"
import SettingsPage from "./pages/SettingsPage.jsx"

const TABS = [
  { id: "overview", label: "Início", title: "Visão geral", Icon: IconHome },
  { id: "schedule", label: "Lote", title: "Lote", Icon: IconSchedule },
  { id: "temperature", label: "Temp.", title: "Temperatura", Icon: IconTemp },
  { id: "log", label: "Registro", title: "Registro de Eventos", Icon: IconLog },
  { id: "settings", label: "Config.", title: "Configurações", Icon: IconSettings },
]

function connectionColor(f) {
  if (f.status !== "connected") return "#9CA3AF"
  return f.stale ? "#F59E0B" : "#16A34A"
}

export default function App() {
  const f = useFermenter()
  const [nav, setNav] = useState("overview")
  const [confirm, setConfirm] = useState(null)

  const askConfirm = (options) => setConfirm(options)
  const title = TABS.find((t) => t.id === nav).title
  const dot = connectionColor(f)

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Cabeçalho */}
        <div style={{ height: 56, background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#20242B" }}>{title}</p>
            {f.settings.mode === "dev" && (
              <span style={{ padding: "3px 6px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>
                DEV MODE
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} aria-live="polite">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, boxShadow: f.status === "connected" && !f.stale ? "0 0 0 2px #DCFCE7" : "none" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: f.telemetry ? "#2563EB" : "#9CA3AF", fontWeight: 600 }}>
              {f.telemetry ? `${f.telemetry.chamber.toFixed(2)} °C` : "—"}
            </span>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
          {nav === "overview" && <OverviewPage f={f} />}
          {nav === "schedule" && <BatchPage f={f} askConfirm={askConfirm} />}
          {nav === "temperature" && <TemperaturePage f={f} />}
          {nav === "log" && <LogPage f={f} />}
          {nav === "settings" && <SettingsPage f={f} />}
        </div>

        {confirm && (
          <ConfirmDialog
            {...confirm}
            onCancel={() => setConfirm(null)}
            onConfirm={() => {
              confirm.onConfirm()
              setConfirm(null)
            }}
          />
        )}

        {/* Navegação inferior */}
        <nav style={{ minHeight: 74, background: "#fff", borderTop: "1px solid #E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "space-around", padding: "10px 0 env(safe-area-inset-bottom)", flexShrink: 0 }}>
          {TABS.map(({ id, label, Icon }) => {
            const active = nav === id
            return (
              <button
                key={id}
                onClick={() => setNav(id)}
                aria-current={active ? "page" : undefined}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "0 12px", WebkitTapHighlightColor: "transparent" }}
              >
                <Icon active={active} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "#2563EB" : "#9CA3AF" }}>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
