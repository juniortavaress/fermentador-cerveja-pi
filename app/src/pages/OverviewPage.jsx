import { HOUR_MS, runClock, stageFraction, stageRemainingMs, totalHours } from "../domain/engine.js"
import { formatDuration } from "../domain/format.js"
import { summarize } from "../domain/records.js"
import { fmtTemp } from "../domain/units.js"
import { Card } from "../ui/primitives.jsx"
import { IconPause, IconPlay, IconSkip, IconStop } from "../ui/icons.jsx"
import RunChart from "./RunChart.jsx"
import { activityInfo } from "../ui/connection.js"

function RunCard({ f, askConfirm }) {
  const { run, runBatch: batch, now } = f
  const unit = f.settings.unit
  const stage = batch.stages[run.stageIndex]
  const next = batch.stages[run.stageIndex + 1]
  const last = !next
  const paused = !!run.pausedAt

  const requestStop = () =>
    askConfirm({
      title: "Encerrar a fermentação?",
      message: `“${batch.name}” será encerrada. Para fermentar de novo, ela recomeça pela primeira etapa.`,
      confirmLabel: "Encerrar fermentação",
      onConfirm: f.stopBatch,
    })

  const requestSkip = () =>
    askConfirm({
      title: last ? "Concluir a fermentação?" : "Pular esta etapa?",
      message: last
        ? `“${stage.name}” é a última etapa. Concluir finaliza a fermentação.`
        : `“${stage.name}” termina agora e o lote segue para “${next.name}”. A temperatura será ajustada sozinha.`,
      confirmLabel: last ? "Concluir" : "Pular etapa",
      onConfirm: f.skipCurrentStage,
    })

  return (
    <Card>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="label">{paused ? "Pausada" : "Fermentando"}</p>
          <p className="h2" style={{ marginTop: 4 }}>
            {batch.name}
          </p>
        </div>
        <span className={`pill ${paused ? "amber" : "blue"}`}>
          Etapa {run.stageIndex + 1} de {batch.stages.length}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{stage.name}</p>
          <p className="sub">a {fmtTemp(stage.temp, unit)} °{unit}</p>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(stageFraction(run, batch, now) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${stageFraction(run, batch, now) * 100}%`, background: paused ? "#f59e0b" : undefined }} />
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Restam {formatDuration(stageRemainingMs(run, batch, now))}
          {last ? " · última etapa" : ""}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {paused ? (
          <>
            <button className="btn green small-btn" onClick={f.resumeBatch}>
              <IconPlay /> Retomar
            </button>
            <button className="btn ghost-red small-btn" onClick={requestStop}>
              <IconStop /> Encerrar
            </button>
          </>
        ) : (
          <>
            <button className="btn ghost small-btn" onClick={f.pauseBatch}>
              <IconPause /> Pausar
            </button>
            <button className="btn ghost small-btn" onClick={requestSkip}>
              <IconSkip /> {last ? "Concluir" : "Pular etapa"}
            </button>
          </>
        )}
      </div>
    </Card>
  )
}

/** Uma barra dividida por etapa: as concluídas cheias, a atual parcial, as próximas vazias. */
function ProgressCard({ f }) {
  const { run, runBatch: batch, now } = f
  const unit = f.settings.unit
  const totalMs = totalHours(batch) * HOUR_MS
  const elapsed = Math.min(Math.max(runClock(run, now) - run.startedAt, 0), totalMs)

  return (
    <Card>
      <p className="label" style={{ marginBottom: 12 }}>
        Progresso da fermentação
      </p>
      <div className="seg-row">
        {batch.stages.map((st, i) => {
          const done = i < run.stageIndex
          const active = i === run.stageIndex
          const fill = done ? 1 : active ? stageFraction(run, batch, now) : 0
          return (
            <div key={`${st.name}-${i}`} className="seg">
              <div className="seg-bar" data-state={done ? "done" : active ? "active" : "pending"}>
                <div style={{ width: `${fill * 100}%` }} />
              </div>
              <span className={`seg-name ${done || active ? "on" : ""}`} title={st.name}>
                {st.name.trim().slice(0, 4).toUpperCase()}
              </span>
              <span className={`seg-temp ${active ? "on" : ""}`}>
                {fmtTemp(st.temp, unit)} °{unit}
              </span>
            </div>
          )
        })}
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <p className="small">Decorrido {formatDuration(elapsed)}</p>
        <p className="small">
          Duração total <b style={{ color: "#20242B" }}>{formatDuration(totalMs)}</b>
        </p>
      </div>
    </Card>
  )
}

/** Mínima e máxima desta fermentação e o que a placa está acionando agora. */
function RunStats({ f }) {
  const t = f.telemetry
  const unit = f.settings.unit
  const s = summarize(f.activeRecord?.points ?? [])
  const fmt = (v) => (v == null ? "—" : `${fmtTemp(v, unit)} °${unit}`)
  const tiles = [
    ["Temp. mín.", fmt(s?.min)],
    ["Temp. máx.", fmt(s?.max)],
    ["Peltier", t ? (t.cooling ? "Resfriando" : "Inativo") : "—", "cool", t?.cooling],
    ["Resistência", t ? (t.heating ? "Aquecendo" : "Inativa") : "—", "heat", t?.heating],
  ]
  return (
    <div className="stat-grid">
      {tiles.map(([label, value, kind, on]) => (
        <div className={`stat${kind ? ` ${kind}` : ""}${on ? " on" : ""}`} key={label}>
          <p className="small">
            {kind && <span className="lamp" aria-hidden="true" />}
            {label}
          </p>
          <b>{value}</b>
        </div>
      ))}
    </div>
  )
}

export default function OverviewPage({ f, go, askConfirm }) {
  const t = f.telemetry
  const unit = f.settings.unit
  const { run, runBatch, now } = f
  const running = run !== null && runBatch !== null

  const activity = activityInfo(t)

  return (
    <>
      {/* Temperatura agora */}
      <Card>
        <p className="label">Temperatura da câmara</p>
        <div className="row" style={{ alignItems: "flex-end", marginTop: 6 }}>
          {t ? (
            <p style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {fmtTemp(t.chamber, unit)}
              <span style={{ fontSize: 22, fontWeight: 500, color: "#9CA3AF", marginLeft: 4 }}>°{unit}</span>
            </p>
          ) : (
            <p style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: "#9CA3AF" }}>Sem leitura</p>
          )}
          {activity && <span className={`pill ${activity.tone}`}>{activity.text}</span>}
        </div>
        {!t && <p className="small" style={{ marginTop: 8 }}>Conecte a placa em Ajustes para ver a temperatura.</p>}

      </Card>

      {/* Fermentação */}
      {running ? (
        <>
          <RunCard f={f} askConfirm={askConfirm} />
          <ProgressCard f={f} />
        </>
      ) : (
        <Card className="idle-card">
          <div className="idle-art" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10h24M22 10v10c-4 3-6 7-6 12v16a6 6 0 0 0 6 6h20a6 6 0 0 0 6-6V32c0-5-2-9-6-12V10" fill="#fff" />
              <path d="M16 32h32" stroke="#93C5FD" />
              <circle cx="27" cy="40" r="2.4" stroke="#93C5FD" />
              <circle cx="36" cy="37" r="1.8" stroke="#93C5FD" />
              <circle cx="38" cy="46" r="2.8" stroke="#93C5FD" />
            </svg>
          </div>
          <p className="h2" style={{ fontSize: 20 }}>Pronto para fermentar</p>
          <p className="sub" style={{ marginTop: 6 }}>
            Escolha uma receita e dê o play. A placa cuida da temperatura sozinha.
          </p>
          <button className="btn green" style={{ marginTop: 18 }} onClick={() => go("batches")}>
            ▶ Escolher lote e iniciar
          </button>
        </Card>
      )}

      {/* Gráfico: só com fermentação em andamento */}
      {running && <RunChart f={f} />}

      {/* Mínima, máxima e o que a placa está acionando */}
      {running && <RunStats f={f} />}
    </>
  )
}
