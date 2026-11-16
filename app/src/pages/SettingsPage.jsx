import { Card } from "../ui/primitives.jsx"

const groupHeader = {
  fontSize: 12,
  fontWeight: 600,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

function Group({ title, children }) {
  return (
    <Card>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB" }}>
        <p style={groupHeader}>{title}</p>
      </div>
      {children}
    </Card>
  )
}

function Row({ label, sub, control }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ flex: 1, paddingRight: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#20242B" }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{sub}</p>}
      </div>
      {control}
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={onChange}
      style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: value ? "#2563EB" : "#E5E7EB", transition: "background 0.2s", position: "relative", padding: 0, flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  )
}

const STATUS = {
  connected: { text: "Conectado", color: "#16A34A" },
  connecting: { text: "Conectando…", color: "#F59E0B" },
  error: { text: "Erro", color: "#DC2626" },
  disconnected: { text: "Desconectado", color: "#9CA3AF" },
}

export default function SettingsPage({ f }) {
  const { settings, status } = f
  const developer = settings.mode === "dev"
  const running = f.run !== null
  const st = status === "connected" && f.stale ? { text: "Sem dados", color: "#F59E0B" } : STATUS[status]
  const connected = status === "connected"
  const canConnect = developer || f.serialSupported

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Group title="Conexão">
        <Row
          label={developer ? "Simulador" : "Dispositivo USB"}
          sub={f.statusDetail && !connected ? f.statusDetail : developer ? "Placa virtual, sem hardware" : "Arduino pela porta USB (Chrome ou Edge)"}
          control={
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: st.color }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
              {st.text}
            </span>
          }
        />
        <div style={{ padding: "12px 16px" }}>
          {!canConnect ? (
            <p style={{ fontSize: 12, color: "#B91C1C" }}>Este navegador não suporta USB Serial. Abra no Chrome ou no Edge.</p>
          ) : connected ? (
            <button
              onClick={() => f.disconnect()}
              disabled={running}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.5 : 1 }}
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={() => f.connect()}
              disabled={status === "connecting"}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {status === "connecting" ? "Conectando…" : developer ? "Iniciar simulador" : "Conectar dispositivo"}
            </button>
          )}
          {running && connected && (
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>Pare a fermentação para desconectar.</p>
          )}
        </div>
      </Group>

      <Group title="Temperatura">
        <Row
          label="Delta T (histerese)"
          sub={`±${settings.hysteresis.toFixed(1)} °C em volta do set point`}
          control={
            <input
              aria-label="Delta T"
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={settings.hysteresis}
              onChange={(e) => f.updateSettings({ hysteresis: +e.target.value })}
              style={{ accentColor: "#2563EB", width: 90 }}
            />
          }
        />
        <Row
          label="Ciclo Mín. do Peltier"
          sub={settings.minCycleMin === 0 ? "Sem tempo mínimo entre ciclos" : `${settings.minCycleMin} min de descanso entre ciclos`}
          control={
            <input
              aria-label="Ciclo mínimo do Peltier"
              type="range"
              min={0}
              max={10}
              step={1}
              value={settings.minCycleMin}
              onChange={(e) => f.updateSettings({ minCycleMin: +e.target.value })}
              style={{ accentColor: "#2563EB", width: 90 }}
            />
          }
        />
      </Group>

      <Group title="Modo de operação">
        <div style={{ padding: "15px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 11 }}>
          <span style={{ fontSize: 11, fontWeight: developer ? 600 : 400, color: developer ? "#2563EB" : "#9CA3AF" }}>Developer Mode</span>
          <button
            aria-label="Alternar entre Developer Mode e Live Mode"
            disabled={running}
            onClick={() => f.setMode(developer ? "live" : "dev")}
            style={{ width: 52, height: 28, borderRadius: 14, border: "none", cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.5 : 1, background: developer ? "#DBEAFE" : "#DCFCE7", position: "relative", padding: 0 }}
          >
            <span style={{ position: "absolute", top: 3, left: developer ? 3 : 27, width: 22, height: 22, borderRadius: "50%", background: developer ? "#2563EB" : "#16A34A", transition: "left 0.2s, background 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
          </button>
          <span style={{ fontSize: 11, fontWeight: developer ? 400 : 600, color: developer ? "#9CA3AF" : "#16A34A" }}>Live Mode</span>
        </div>
        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", padding: "0 16px 14px" }}>
          {running
            ? "Pare a fermentação para trocar de modo."
            : developer
              ? "Dados simulados, para testar o app sem a placa."
              : "Dados reais da placa."}
        </p>
      </Group>

      <Group title="Alertas">
        <Row
          label="Alertas de Desvio"
          sub="Registra no log quando a temperatura passar de ±0,5 °C do set point"
          control={<Toggle label="Alertas de desvio" value={settings.alerts} onChange={() => f.updateSettings({ alerts: !settings.alerts })} />}
        />
      </Group>
    </div>
  )
}
