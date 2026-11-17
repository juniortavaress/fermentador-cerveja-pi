import { stageFraction, stageRemainingMs } from "../domain/engine.js"
import { formatDuration } from "../domain/format.js"
import { fmtTemp } from "../domain/units.js"
import { Card } from "../ui/primitives.jsx"
import RunChart from "./RunChart.jsx"
import { activityInfo } from "../ui/connection.js"

function RunCard({ f, askConfirm }) {
  const { run, runBatch: batch, now } = f
  const unit = f.settings.unit
  const stage = batch.stages[run.stageIndex]
  const next = batch.stages[run.stageIndex + 1]
  const last = !next

  const requestStop = () =>
    askConfirm({
      title: "Parar a fermentação?",
      message: `“${batch.name}” será interrompida. Para fermentar de novo, ela recomeça pela primeira etapa.`,
      confirmLabel: "Parar fermentação",
      onConfirm: f.stopBatch,
    })

  const requestSkip = () =>
    askConfirm({
      title: last ? "Encerrar a fermentação?" : "Pular esta etapa?",
      message: last
        ? `“${stage.name}” é a última etapa. Pular encerra a fermentação.`
        : `“${stage.name}” termina agora e o lote segue para “${next.name}”. A temperatura será ajustada sozinha.`,
      confirmLabel: last ? "Encerrar" : "Pular etapa",
      onConfirm: f.skipCurrentStage,
    })

  return (
    <Card>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="label">Fermentando</p>
          <p className="h2" style={{ marginTop: 4 }}>
            {batch.name}
          </p>
        </div>
        <span className="pill blue">
          Etapa {run.stageIndex + 1} de {batch.stages.length}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{stage.name}</p>
          <p className="sub">a {fmtTemp(stage.temp, unit)} °{unit}</p>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(stageFraction(run, batch, now) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${stageFraction(run, batch, now) * 100}%` }} />
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Restam {formatDuration(stageRemainingMs(run, batch, now))}
          {next ? ` · depois: ${next.name} a ${fmtTemp(next.temp, unit)} °${unit}` : " · última etapa"}
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn ghost small-btn" onClick={requestSkip}>
          {last ? "Encerrar" : "Pular etapa"}
        </button>
        <button className="btn ghost-red small-btn" onClick={requestStop}>
          Parar
        </button>
      </div>
    </Card>
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
        <RunCard f={f} askConfirm={askConfirm} />
      ) : (
        <Card className="idle-card">
          <div className="idle-art" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10h24M22 10v10c-4 3-6 7-6 12v10l16 12 16-12V32c0-5-2-9-6-12V10" fill="#fff" />
              <path d="M16 36h32" stroke="#93C5FD" />
              <circle cx="27" cy="30" r="2.4" stroke="#93C5FD" />
              <circle cx="36" cy="26" r="1.8" stroke="#93C5FD" />
              <circle cx="38" cy="32" r="2.8" stroke="#93C5FD" />
              <path d="M32 54v4" />
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
    </>
  )
}
