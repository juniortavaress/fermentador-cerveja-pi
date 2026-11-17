import { fmtTemp } from "../domain/units.js"
import { SIM_LIMITS, setSimControl } from "../transport/simControl.js"
import { useSimControl } from "./useSimControl.js"

// Pinos do firmware (config.h): pot na A0 (temperatura interna), NTC na A1 (ambiente), resistência na D2, relé do resfriador na D8.

/** Resistência de aquecimento: uma mola que fica laranja/vermelha quando liga. */
function Coil({ on }) {
  return (
    <g data-testid="coil" data-on={on}>
      <path
        d="M325 115 q7 -28 14 0 t14 0 t14 0 t14 0 t14 0 t14 0"
        fill="none"
        stroke={on ? "url(#heatGrad)" : "#9ca3af"}
        strokeWidth={on ? 4.5 : 3.5}
        strokeLinecap="round"
      />
      <path d="M409 115 h14" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )
}

/** Ventoinha do resfriador: gira quando o relé liga. */
function Fan({ on }) {
  return (
    <g transform="translate(365 232)" data-testid="fan" data-on={on}>
      <circle r="28" fill="#fff" stroke={on ? "#2563eb" : "#9ca3af"} strokeWidth="2.5" />
      <g fill={on ? "#60a5fa" : "#d1d5db"} stroke={on ? "#2563eb" : "#9ca3af"} strokeWidth="1.5">
        {[0, 90, 180, 270].map((a) => (
          <path key={a} transform={`rotate(${a})`} d="M0 0 C6 -6 10 -16 3 -23 C-4 -25 -8 -14 0 0Z" />
        ))}
        {on && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.45s" repeatCount="indefinite" />}
      </g>
      <circle r="4" fill={on ? "#2563eb" : "#9ca3af"} />
    </g>
  )
}

export default function CircuitPanel({ f }) {
  const sim = useSimControl()
  const unit = f.settings.unit
  const t = f.telemetry
  const heating = !!t?.heating
  const cooling = !!t?.cooling
  const fmt = (c) => `${fmtTemp(c, unit)} °${unit}`
  const potAngle = -135 + ((sim.chamber - SIM_LIMITS.chamber.min) / (SIM_LIMITS.chamber.max - SIM_LIMITS.chamber.min)) * 270

  return (
    <aside className="circuit" aria-label="Circuito simulado">
      <div className="row" style={{ marginBottom: 6 }}>
        <p className="h2">Circuito</p>
        <span className="pill">{sim.auto ? "Automático" : "Simulado"}</span>
      </div>

      <svg viewBox="0 44 440 246" role="img" aria-label="Esquema do circuito: Arduino Nano, potenciômetro, NTC, resistência e ventoinha" style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="heatGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="1" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* fios */}
        <g fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M100 115 H150" />
          <path d="M98 235 H124 V175 H150" />
          <path d="M290 115 H325" />
          <path d="M290 175 H315" />
          <path d="M351 175 H365 V204" />
        </g>

        {/* Arduino Nano */}
        <rect x="195" y="52" width="50" height="20" rx="4" fill="#cbd5e1" />
        <rect x="150" y="68" width="140" height="196" rx="12" fill="#0e5a6b" />
        <g fill="#e2e8f0" fontSize="11" fontFamily="Inter, sans-serif">
          <text x="160" y="119">A0</text>
          <text x="160" y="179">A1</text>
          <text x="280" y="119" textAnchor="end">D2</text>
          <text x="280" y="179" textAnchor="end">D8</text>
        </g>
        {[115, 175].map((y) => (
          <g key={y}>
            <circle cx="150" cy={y} r="4" fill="#fbbf24" />
            <circle cx="290" cy={y} r="4" fill="#fbbf24" />
          </g>
        ))}
        <text x="220" y="100" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">
          ARDUINO NANO
        </text>
        <text x="220" y="222" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">
          {t ? `Alvo ${fmt(t.setpoint)}` : "Sem sinal"}
        </text>
        <text x="220" y="242" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="Inter, sans-serif">
          {t?.active === false ? "Em espera" : ""}
        </text>

        {/* potenciômetro (câmara) */}
        <g transform="translate(70 115)">
          <circle r="30" fill="#fff" stroke="#64748b" strokeWidth="2.5" />
          <circle r="22" fill="#f1f5f9" stroke="#cbd5e1" />
          <g transform={`rotate(${potAngle})`}>
            <line x1="0" y1="0" x2="0" y2="-19" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle r="4" fill="#2563eb" />
        </g>
        <text x="70" y="168" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b" fontFamily="Inter, sans-serif">
          {fmt(sim.chamber)}
        </text>
        <text x="70" y="183" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          interna
        </text>

        {/* NTC (ambiente) */}
        <g transform="translate(70 235)">
          <rect x="-28" y="-11" width="56" height="22" rx="3" fill="#fff" stroke="#64748b" strokeWidth="2.5" />
          <path d="M-18 9 L18 -9" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
        </g>
        <text x="70" y="270" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b" fontFamily="Inter, sans-serif">
          {fmt(sim.ambient)}
        </text>
        <text x="70" y="285" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          ambiente
        </text>

        {/* resistência: mola */}
        <Coil on={heating} />
        <text x="366" y="80" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          Resistência
        </text>

        {/* relé + ventoinha */}
        <rect x="315" y="163" width="36" height="24" rx="4" fill="#fff" stroke="#64748b" strokeWidth="2" />
        <text x="333" y="179" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155" fontFamily="Inter, sans-serif">
          RELÉ
        </text>
        <circle cx="344" cy="168" r="2.5" fill={cooling ? "#22c55e" : "#cbd5e1"} />
        <Fan on={cooling} />
        <text x="366" y="278" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Inter, sans-serif">
          Ventoinha
        </text>
      </svg>

      <div className="circuit-controls">
        <div>
          <div className="row">
            <label htmlFor="sim-pot" style={{ fontWeight: 600 }}>
              Temperatura interna
            </label>
            <span className="pill blue">{fmt(sim.chamber)}</span>
          </div>
          <input id="sim-pot" aria-label="Temperatura interna (potenciômetro)" className="slider" type="range" min={SIM_LIMITS.chamber.min} max={SIM_LIMITS.chamber.max} step={0.1} value={sim.chamber} onChange={(e) => setSimControl({ chamber: +e.target.value, auto: false })} />
        </div>
        <div>
          <div className="row">
            <label htmlFor="sim-amb" style={{ fontWeight: 600 }}>
              Temperatura ambiente
            </label>
            <span className="pill">{fmt(sim.ambient)}</span>
          </div>
          <input id="sim-amb" aria-label="Temperatura ambiente (NTC)" className="slider" type="range" min={SIM_LIMITS.ambient.min} max={SIM_LIMITS.ambient.max} step={0.1} value={sim.ambient} onChange={(e) => setSimControl({ ambient: +e.target.value, auto: false })} />
        </div>
      </div>
    </aside>
  )
}
