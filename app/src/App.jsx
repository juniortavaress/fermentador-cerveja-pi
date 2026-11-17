import { useEffect, useState } from "react"
import { useFermenter } from "./state/useFermenter.js"
import { ConfirmDialog } from "./ui/primitives.jsx"
import { connectionInfo } from "./ui/connection.js"
import { IconBatches, IconChart, IconHome, IconLog, IconSettings } from "./ui/icons.jsx"
import OverviewPage from "./pages/OverviewPage.jsx"
import BatchPage from "./pages/BatchPage.jsx"
import TemperaturePage from "./pages/TemperaturePage.jsx"
import LogPage from "./pages/LogPage.jsx"
import SettingsPage from "./pages/SettingsPage.jsx"
import CircuitPanel from "./ui/CircuitPanel.jsx"
import { useDesktop } from "./ui/useMediaQuery.js"

const TABS = [
  { id: "home", label: "Início", Icon: IconHome },
  { id: "batches", label: "Lotes", Icon: IconBatches },
  { id: "temp", label: "Histórico", Icon: IconChart },
  { id: "log", label: "Registro", Icon: IconLog },
  { id: "settings", label: "Ajustes", Icon: IconSettings },
]

const FRAME_HEIGHT = 868 // altura do celular com a moldura

/** Encolhe a moldura quando a janela é baixa, para o celular inteiro caber na tela. */
function useFrameScale() {
  const calc = () => Math.min(1, Math.max(0.5, (window.innerHeight - 24) / FRAME_HEIGHT))
  const [scale, setScale] = useState(calc)
  useEffect(() => {
    const onResize = () => setScale(calc())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return scale
}

function StatusBar() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const hh = String(time.getHours()).padStart(2, "0")
  const mm = String(time.getMinutes()).padStart(2, "0")
  return (
    <div className="statusbar" aria-hidden="true">
      <span>
        {hh}:{mm}
      </span>
      <svg width="62" height="12" viewBox="0 0 62 12" fill="#20242B">
        <rect x="0" y="7" width="3" height="5" rx="1" />
        <rect x="5" y="5" width="3" height="7" rx="1" />
        <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
        <path d="M30 3a8 8 0 0 1 10 0M32 6a5 5 0 0 1 6 0" stroke="#20242B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="9.5" r="1.4" />
        <rect x="46" y="1" width="13" height="10" rx="3" fill="none" stroke="#20242B" strokeWidth="1" />
        <rect x="47.5" y="2.5" width="9" height="7" rx="1.6" />
        <rect x="60" y="4" width="1.5" height="4" rx="0.7" />
      </svg>
    </div>
  )
}

export default function App() {
  const f = useFermenter()
  const [nav, setNav] = useState("home")
  const [confirm, setConfirm] = useState(null)
  const [tabKey, setTabKey] = useState(0) // muda ao tocar numa aba: ela volta ao começo (ex.: lista de lotes)
  const scale = useFrameScale()
  const desktop = useDesktop()
  const showCircuit = desktop && f.settings.mode === "dev"

  const conn = connectionInfo(f)
  const title = TABS.find((t) => t.id === nav).label
  const onChip = () => setNav("settings")

  return (
    <div className="stage">
      <div className="stage-row" style={{ "--scale": scale }}>
      <div className="phone">
        <div className="screen">
          <div className="island" />
          <StatusBar />

          <header className="appbar">
            <h1>{title}</h1>
            <button className={`conn-chip ${conn.tone}`} onClick={onChip} aria-label={`Dispositivo: ${conn.text}`}>
              <span className="dot" />
              {conn.text}
            </button>
          </header>

          <main className="content">
            {nav === "home" && <OverviewPage f={f} go={setNav} askConfirm={setConfirm} />}
            {nav === "batches" && <BatchPage key={tabKey} f={f} go={setNav} askConfirm={setConfirm} />}
            {nav === "temp" && <TemperaturePage key={tabKey} f={f} askConfirm={setConfirm} />}
            {nav === "log" && <LogPage f={f} />}
            {nav === "settings" && <SettingsPage f={f} />}
          </main>

          <nav className="tabbar">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`tab ${nav === id ? "active" : ""}`} onClick={() => {
                  setTabKey((k) => k + 1)
                  setNav(id)
                }} aria-current={nav === id ? "page" : undefined}>
                <Icon active={nav === id} />
                {label}
              </button>
            ))}
          </nav>

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

          <div className="home-indicator" />
        </div>
      </div>
      {showCircuit && <CircuitPanel f={f} />}
      </div>
    </div>
  )
}
