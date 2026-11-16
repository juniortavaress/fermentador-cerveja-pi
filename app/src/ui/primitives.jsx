import { formatDateTime } from "../domain/format.js"

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, ...style }}>
      {children}
    </div>
  )
}

/** Rótulo pequeno em caixa alta usado no topo dos cartões. */
export function SectionLabel({ children, style = {} }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#9CA3AF",
        ...style,
      }}
    >
      {children}
    </p>
  )
}

export function StagePill({ stage, muted = false }) {
  return (
    <span
      style={{
        background: muted ? "#E5E7EB" : "#2563EB",
        color: muted ? "#6B7280" : "#fff",
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 6,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {stage}
    </span>
  )
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 10px", fontSize: 11 }}>
      <p style={{ color: "#9CA3AF", marginBottom: 2 }}>{formatDateTime(label)}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.name} style={{ color: p.color, fontFamily: "JetBrains Mono, monospace" }}>
            {p.name}: {Number(p.value).toFixed(1)} °C
          </p>
        ))}
    </div>
  )
}

/** Chips de filtro (24h / 48h / Tudo, Todos / Alertas). */
export function FilterChips({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            border: "1px solid",
            transition: "all 0.15s",
            borderColor: value === id ? "#2563EB" : "#E5E7EB",
            background: value === id ? "#2563EB" : "#fff",
            color: value === id ? "#fff" : "#6B7280",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** Botão de + / − do set point manual. */
export function SetpointDial({ value, onChange, disabled = false }) {
  const btn = (delta, label) => (
    <button
      aria-label={delta > 0 ? "Aumentar set point" : "Diminuir set point"}
      disabled={disabled}
      onClick={() => onChange(Math.min(30, Math.max(0, +(value + delta).toFixed(1))))}
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "1.5px solid #E5E7EB",
        background: "#F9FAFB",
        fontSize: 22,
        color: "#20242B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
      {btn(-0.5, "−")}
      <div style={{ textAlign: "center", minWidth: 100 }}>
        <p
          style={{
            fontSize: 42,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: disabled ? "#9CA3AF" : "#2563EB",
            lineHeight: 1,
          }}
        >
          {value.toFixed(1)}
        </p>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>°C setpoint alvo</p>
      </div>
      {btn(+0.5, "+")}
    </div>
  )
}

/** Diálogo de confirmação (parar, pular etapa, apagar). */
export function ConfirmDialog({ title, message, confirmLabel, danger = true, onConfirm, onCancel }) {
  const accent = danger ? "#DC2626" : "#2563EB"
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "rgba(17,24,39,0.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
      }}
    >
      <div style={{ width: "100%", background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 20px 45px rgba(0,0,0,0.24)" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: danger ? "#FEF2F2" : "#EFF6FF",
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          !
        </div>
        <p id="confirm-title" style={{ fontSize: 17, fontWeight: 700, color: "#20242B" }}>
          {title}
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "#6B7280", marginTop: 6 }}>{message}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
