import { useState } from 'react'
import type {
  CharacterDetail,
  CharacterFocus,
  DroptimizerReport,
  DroptimizerUpgrade
} from '@shared/types'
import { slotCapacity } from '@shared/slots'
import type { Hub } from '../state'

interface Props {
  hub: Hub
  character: CharacterDetail
  reports: DroptimizerReport[]
  focus: CharacterFocus
}

type View = 'bySlot' | 'all'

export default function Droptimizer({ hub, character, reports, focus }: Props): JSX.Element {
  const { t } = hub
  const [input, setInput] = useState('')
  const [jsonMode, setJsonMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('bySlot')

  const importReport = async (): Promise<void> => {
    if (!input.trim()) return
    setBusy(true)
    const result = await hub.run(
      () =>
        jsonMode
          ? window.api.reports.importJson(input, character.id)
          : window.api.reports.importUrl(input, character.id),
      t('dropt.imported')
    )
    setBusy(false)
    if (result) setInput('')
  }

  return (
    <section className="panel">
      <h2>
        {t('dropt.title')}
        <span className="hint">{t('dropt.hint', { name: character.name })}</span>
      </h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {jsonMode ? (
          <textarea
            rows={4}
            placeholder={t('dropt.placeholder.json')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        ) : (
          <input
            placeholder={t('dropt.placeholder.url')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void importReport()
            }}
          />
        )}
        <button
          className="btn primary"
          disabled={busy || !input.trim()}
          onClick={() => void importReport()}
        >
          {busy ? t('dropt.importing') : t('dropt.import')}
        </button>
        <button
          className="btn small"
          onClick={() => {
            setJsonMode((v) => !v)
            setInput('')
          }}
          title={t('dropt.mode.hint')}
        >
          {jsonMode ? t('dropt.mode.link') : t('dropt.mode.json')}
        </button>
      </div>

      {focus.entries.length === 0 ? (
        <p className="faint">{t('dropt.empty')}</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
            {focus.entries.map((entry, index) => (
              <div className={`focus-card${index === 0 ? ' top' : ''}`} key={entry.contentTag}>
                <div>
                  <div className="rank">
                    {index === 0 ? t('dropt.focus.first') : t('dropt.focus.rank', { rank: index + 1 })}
                  </div>
                  <div className="tag">{entry.contentTag}</div>
                  <div className="faint">
                    {t('dropt.focus.upgrades', { count: entry.upgradeCount })}
                    {entry.bestItem
                      ? ` · ${t('dropt.focus.best', { item: entry.bestItem.itemName })}`
                      : ''}
                  </div>
                </div>
                <div className="gain">
                  <b>+{entry.top3AvgPct.toFixed(2)}%</b>
                  <div className="faint">{t('dropt.focus.top3')}</div>
                  <div className="faint">
                    {t('dropt.focus.peak', { value: entry.bestGainPct.toFixed(2) })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="view-switch">
            <button
              className={view === 'bySlot' ? 'active' : ''}
              onClick={() => setView('bySlot')}
            >
              {t('dropt.view.bySlot')}
            </button>
            <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
              {t('dropt.view.all')}
            </button>
          </div>

          {view === 'bySlot' ? (
            <BySlot hub={hub} focus={focus} />
          ) : (
            reports.map((report) => (
              <ReportBlock key={report.reportId} hub={hub} report={report} />
            ))
          )}
        </>
      )}
    </section>
  )
}

/**
 * Vue « une ligne par emplacement ».
 *
 * C'est la lecture utile d'un droptimizer : dix colliers concurrents ne servent
 * à rien quand un seul se porte. Les anneaux et bijoux gardent deux lignes,
 * puisque deux s'équipent.
 */
function BySlot({ hub, focus }: { hub: Hub; focus: CharacterFocus }): JSX.Element {
  const { t } = hub
  const slots = focus.bySlot.filter((slot) => slot.upgrades.length > 0)

  if (!slots.length) return <p className="faint">{t('dropt.bySlot.empty')}</p>

  return (
    <div>
      {slots.map((slot) => {
        const capacity = slotCapacity(slot.slotGroup)
        return (
          <div className="slot-block" key={slot.slotGroup}>
            <div className="slot-name">
              {t(`slotGroup.${slot.slotGroup}`)}
              {slot.candidateCount > capacity && (
                <span className="faint"> · {slot.candidateCount}</span>
              )}
            </div>
            <div className="slot-items">
              {slot.upgrades.map((upgrade) => (
                <UpgradeRow key={`${upgrade.itemId}-${upgrade.itemName}`} hub={hub} upgrade={upgrade} content={upgrade.contentTag} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function UpgradeRow({
  hub,
  upgrade,
  content
}: {
  hub: Hub
  upgrade: DroptimizerUpgrade
  content?: string
}): JSX.Element {
  const { t } = hub

  // Le boss est l'information qu'on vient chercher : il passe avant le nom de
  // l'instance, qui n'est qu'un contexte.
  const source = upgrade.boss
    ? upgrade.instance
      ? `${upgrade.boss} — ${upgrade.instance}`
      : upgrade.boss
    : upgrade.instance || t('dropt.source.unknown')

  return (
    <div className="upgrade-row">
      <div>
        <a onClick={() => void window.api.system.openExternal(upgrade.wowheadUrl)}>
          {upgrade.itemName}
        </a>
        <div className="src" title={source}>
          {source}
          {content ? ` · ${content}` : ''}
        </div>
      </div>
      <div className="gain">+{upgrade.gainPct.toFixed(2)}%</div>
    </div>
  )
}

function ReportBlock({ hub, report }: { hub: Hub; report: DroptimizerReport }): JSX.Element {
  const { t } = hub
  const [tag, setTag] = useState(report.contentTag)
  const [open, setOpen] = useState(false)
  const shown = open ? report.upgrades : report.upgrades.slice(0, 8)

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
            title={t('dropt.report.tagHint')}
          />
          <div className="faint">
            {t('dropt.report.baseline', { dps: report.baselineDps.toLocaleString() })} ·{' '}
            {report.fightStyle ?? t('dropt.report.style')}
            {report.targets ? ` · ${t('dropt.report.targets', { count: report.targets })}` : ''} ·{' '}
            {t('dropt.report.imported', {
              date: new Date(report.importedAt).toLocaleDateString()
            })}
          </div>
        </div>
        <button
          className="btn small danger"
          onClick={() => void hub.run(() => window.api.reports.remove(report.reportId))}
        >
          {t('dropt.report.delete')}
        </button>
      </div>

      {report.notes.map((note) => (
        <p className="faint" key={note}>
          {note}
        </p>
      ))}

      {shown.map((upgrade) => (
        <UpgradeRow key={`${upgrade.itemId}-${upgrade.itemName}`} hub={hub} upgrade={upgrade} />
      ))}

      {report.upgrades.length > 8 && (
        <button className="btn small" style={{ marginTop: 6 }} onClick={() => setOpen((v) => !v)}>
          {open
            ? t('dropt.report.collapse')
            : t('dropt.report.expand', { count: report.upgrades.length })}
        </button>
      )}
    </div>
  )
}
