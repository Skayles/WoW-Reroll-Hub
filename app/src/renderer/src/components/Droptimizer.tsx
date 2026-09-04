import { useState } from 'react'
import type { CharacterDetail, CharacterFocus, DroptimizerReport } from '@shared/types'
import type { Hub } from '../state'

interface Props {
  hub: Hub
  character: CharacterDetail
  reports: DroptimizerReport[]
  focus: CharacterFocus
}

export default function Droptimizer({ hub, character, reports, focus }: Props): JSX.Element {
  const [input, setInput] = useState('')
  const [jsonMode, setJsonMode] = useState(false)
  const [busy, setBusy] = useState(false)

  const importReport = async (): Promise<void> => {
    if (!input.trim()) return
    setBusy(true)
    const result = await hub.run(
      () =>
        jsonMode
          ? window.api.reports.importJson(input, character.id)
          : window.api.reports.importUrl(input, character.id),
      'Droptimizer importé.'
    )
    setBusy(false)
    if (result) setInput('')
  }

  return (
    <section className="panel">
      <h2>
        Droptimizer
        <span className="hint">
          quel contenu farmer en priorité sur {character.name}
        </span>
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {jsonMode ? (
          <textarea
            rows={4}
            placeholder="Colle ici le contenu du fichier data.json du rapport Raidbots…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        ) : (
          <input
            placeholder="https://www.raidbots.com/simbot/report/…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void importReport()
            }}
          />
        )}
        <button className="btn primary" disabled={busy || !input.trim()} onClick={() => void importReport()}>
          {busy ? 'Import…' : 'Importer'}
        </button>
        <button
          className="btn small"
          onClick={() => {
            setJsonMode((v) => !v)
            setInput('')
          }}
          title="Utile si le rapport a expiré côté Raidbots : télécharge son data.json et colle-le ici."
        >
          {jsonMode ? 'Lien' : 'JSON'}
        </button>
      </div>

      {focus.entries.length === 0 ? (
        <p className="faint">
          Aucun droptimizer importé. Lance une simulation Droptimizer sur raidbots.com pour ce
          perso (une par contenu : raid héroïque, raid mythique, donjons…), puis colle le lien du
          rapport ci-dessus. Le classement des contenus apparaîtra ici.
        </p>
      ) : (
        <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
          {focus.entries.map((entry, index) => (
            <div className={`focus-card${index === 0 ? ' top' : ''}`} key={entry.contentTag}>
              <div>
                <div className="rank">
                  {index === 0 ? 'À focus en priorité' : `Priorité ${index + 1}`}
                </div>
                <div className="tag">{entry.contentTag}</div>
                <div className="faint">
                  {entry.upgradeCount} amélioration{entry.upgradeCount > 1 ? 's' : ''}
                  {entry.bestItem ? ` · meilleur : ${entry.bestItem.itemName}` : ''}
                </div>
              </div>
              <div className="gain">
                <b>+{entry.top3AvgPct.toFixed(2)}%</b>
                <div className="faint">moy. top 3</div>
                <div className="faint">pic +{entry.bestGainPct.toFixed(2)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reports.map((report) => (
        <ReportBlock key={report.reportId} hub={hub} report={report} />
      ))}
    </section>
  )
}

function ReportBlock({ hub, report }: { hub: Hub; report: DroptimizerReport }): JSX.Element {
  const [tag, setTag] = useState(report.contentTag)
  const [open, setOpen] = useState(false)
  const shown = open ? report.upgrades : report.upgrades.slice(0, 5)

  return (
    <div>
      <div className="report-head">
        <div className="title">
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onBlur={() => {
              if (tag !== report.contentTag) {
                void hub.run(() => window.api.reports.retag(report.reportId, tag))
              }
            }}
            title="Étiquette de contenu : regroupe plusieurs rapports sous la même priorité."
          />
          <div className="faint">
            {report.baselineDps.toLocaleString('fr-FR')} dps de référence ·{' '}
            {report.fightStyle ?? 'style inconnu'}
            {report.targets ? ` · ${report.targets} cible(s)` : ''} · importé le{' '}
            {new Date(report.importedAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
        <button
          className="btn small danger"
          onClick={() => void hub.run(() => window.api.reports.remove(report.reportId))}
        >
          Supprimer
        </button>
      </div>

      {report.notes.map((note) => (
        <p className="faint" key={note}>
          {note}
        </p>
      ))}

      {shown.map((upgrade) => (
        <div className="upgrade-row" key={`${upgrade.itemId}-${upgrade.itemName}`}>
          <div>
            <a onClick={() => void window.api.system.openExternal(upgrade.wowheadUrl)}>
              {upgrade.itemName}
            </a>
            {upgrade.source && upgrade.source !== 'Inconnue' && (
              <div className="src">{upgrade.source}</div>
            )}
          </div>
          <div className="faint">{upgrade.slot || '—'}</div>
          <div className="gain">+{upgrade.gainPct.toFixed(2)}%</div>
        </div>
      ))}

      {report.upgrades.length > 5 && (
        <button className="btn small" style={{ marginTop: 6 }} onClick={() => setOpen((v) => !v)}>
          {open ? 'Réduire' : `Voir les ${report.upgrades.length} objets`}
        </button>
      )}
    </div>
  )
}
