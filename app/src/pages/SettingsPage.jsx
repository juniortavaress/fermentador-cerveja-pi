import { Card, Segmented, Switch } from "../ui/primitives.jsx"
import { fmtDelta } from "../domain/units.js"
import { connectionInfo } from "../ui/connection.js"

export default function SettingsPage({ f }) {
  const { settings, status } = f
  const dev = settings.mode === "dev"
  const running = f.run !== null
  const conn = connectionInfo(f)
  const connected = status === "connected"
  const canConnect = dev || f.liveSupported
  const tone = { ok: "green", warn: "amber", off: "" }[conn.tone]

  return (
    <>
      <Card>
        <div className="row">
          <p className="h2">Sistema</p>
          <span className={`pill ${tone}`}>{conn.text}</span>
        </div>
        <p className="sub" style={{ marginTop: 6 }}>
          {canConnect ? conn.hint : "Conexão indisponível neste navegador."}
        </p>
        {canConnect &&
          (connected ? (
            <>
              <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => f.disconnect()} disabled={running}>
                Desconectar
              </button>
            </>
          ) : (
            <button className="btn" style={{ marginTop: 14 }} onClick={() => f.connect()} disabled={status === "connecting"}>
              {status === "connecting" ? "Conectando…" : "Conectar fermentador"}
            </button>
          ))}
      </Card>

      <Card className="flush">
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB" }}>
          <p className="label">Exibição</p>
        </div>
        <div className="row" style={{ padding: "14px 16px", borderBottom: "1px solid #F1F2F4" }}>
          <div>
            <p style={{ fontWeight: 600 }}>Alertas de desvio</p>
            <p className="small" style={{ marginTop: 2 }}>
              Alerta se a temperatura exceder ±{fmtDelta(0.5, settings.unit)} °{settings.unit}
            </p>
          </div>
          <Switch label="Alertas de desvio" checked={settings.alerts} onChange={() => f.updateSettings({ alerts: !settings.alerts })} />
        </div>
        <div className="row" style={{ padding: "14px 16px" }}>
          <div>
            <p style={{ fontWeight: 600 }}>Unidade de temperatura</p>
            <p className="small" style={{ marginTop: 2 }}>
              Celsius ou Fahrenheit
            </p>
          </div>
          <div style={{ width: 110, flexShrink: 0 }}>
            <Segmented options={[["C", "°C"], ["F", "°F"]]} value={settings.unit} onChange={(unit) => f.updateSettings({ unit })} />
          </div>
        </div>
      </Card>

      <Card className="flush">
        <div className="row" style={{ padding: "14px 16px" }}>
          <p style={{ fontWeight: 600 }}>Modo dev</p>
          <Switch label="Modo dev" checked={dev} onChange={() => f.setMode(dev ? "live" : "dev")} disabled={running} />
        </div>
      </Card>
    </>
  )
}
