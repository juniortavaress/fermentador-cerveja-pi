import { useEffect } from "react"
import { formatDateTimeSec } from "../domain/format.js"

export function Card({ children, className = "", style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, unit = "C" }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "8px 12px", fontSize: 13 }}>
      <p style={{ color: "#6B7280", marginBottom: 2 }}>{formatDateTimeSec(label)}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {Number(p.value).toFixed(1)} °{unit}
          </p>
        ))}
    </div>
  )
}

/** Seletor de duas ou três opções (24h / 48h / Tudo, Temperatura / Eventos). */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} className={value === id ? "on" : ""} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={onChange} disabled={disabled}>
      <span />
    </button>
  )
}

/** Confirmação de ações que não dá para desfazer (parar, pular, apagar). */
export function ConfirmDialog({ title, message, confirmLabel, danger = true, onConfirm, onCancel }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="sheet">
        <p id="confirm-title" className="h2">
          {title}
        </p>
        <p className="sub" style={{ marginTop: 8 }}>
          {message}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button className={`btn ${danger ? "red" : ""}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Fecha com a tecla Esc. */
export function useEscapeKey(onEscape) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onEscape()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onEscape])
}
