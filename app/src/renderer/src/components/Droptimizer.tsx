import { useMemo, useState } from 'react'
import type {
  CharacterDetail,
  CharacterFocus,
  DroptimizerReport,
  DroptimizerUpgrade
} from '@shared/types'
import { slotCapacity } from '@shared/slots'
import { numberLocale } from '@shared/i18n'
import {
  CATEGORIES,
  RAID_DIFFICULTIES,
  contentKey,
  contentLabelKey,
  hasDifficulty,
  type ContentCategory,
  type RaidDifficulty
} from '@shared/content'
import { computeBySlot, reportsFor, type ContentScope } from '@shared/focus'
import type { Hub } from '../state'
import ItemIcon from './ItemIcon'

interface Props {
  hub: Hub
  character: CharacterDetail
  reports: DroptimizerReport[]
  focus: CharacterFocus
}

type View = 'bySlot' | 'all'

export default function Droptimizer({ hub, character, reports, focus }: Props): JSX.Element {
  const { t } = hub
  const nf = numberLocale(hub.settings?.language ?? 'fr')

  const [input, setInput] = useState('')
  const [jsonMode, setJsonMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<View>('bySlot')
  const [category, setCategory] = useState<ContentCategory | 'TOTAL'>('TOTAL')
  const [difficulty, setDifficulty] = useState<RaidDifficulty>('HEROIC')

  const scope: ContentScope | null =
    category === 'TOTAL'
      ? null
      : { category, difficulty: hasDifficulty(category) ? difficulty : null }

  const scopedReports = useMemo(
    () => reportsFor(reports, character.id, scope),
    [reports, character.id, scope?.category, scope?.difficulty]
  )

  const scopedSlots = useMemo(
    () => (scope ? computeBySlot(scopedReports) : focus.bySlot),
    [scope?.category, scope?.difficulty, scopedReports, focus.bySlot]
  )

  const filled = useMemo(() => {
    const keys = new Set<string>()
    for (const report of reports) {
      if (report.characterId === character.id) {
        keys.add(contentKey(report.category, report.difficulty))
      }
    }
    return keys
  }, [reports, character.id])

  const scopeLabel = scope
    ? t(contentLabelKey(scope.category, scope.difficulty))
    : t('tabs.total')

  const importReport = async (): Promise<void> => {
    if (!input.trim()) return
    setBusy(true)
    const forced = scope ? { category: scope.category, difficulty: scope.difficulty } : undefined
    const result = await hub.run(
      () =>
        jsonMode
          ? window.api.reports.importJson(input, character.id, forced)
          : window.api.reports.importUrl(input, character.id, forced),
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
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
      <p className="faint" style={{ marginTop: 0, marginBottom: 14 }}>
        {scope ? t('dropt.importInto', { content: scopeLabel }) : t('dropt.importAuto')}
      </p>

      {focus.entries.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
          {focus.entries.map((entry, index) => (
            <div
              className={`focus-card${index === 0 ? ' top' : ''}`}
              key={contentKey(entry.category, entry.difficulty)}
            >
              <div>
                <div className="rank">
                  {index === 0
                    ? t('dropt.focus.first')
                    : t('dropt.focus.rank', { rank: index + 1 })}
                </div>
                <div className="tag">{t(entry.labelKey)}</div>
                <div className="faint">
                  {t('dropt.focus.upgrades', { count: entry.upgradeCount })}
                  {entry.bestItem
                    ? ` · ${t('dropt.focus.best', { item: entry.bestItem.itemName })}`
                    : ''}
                </div>
              </div>
              <div className="gain">
                <b>+{entry.top3AvgPct.toFixed(2)}%</b>
                <div className="gain-dps">
                  {t('dropt.gainDps', {
                    value: Math.round(entry.top3AvgGain).toLocaleString(nf)
                  })}
                </div>
                <div className="faint">{t('dropt.focus.top3')}</div>
                <div className="faint">
                  {t('dropt.focus.peak', { value: entry.bestGainPct.toFixed(2) })} ·{' '}
                  {t('dropt.gainDps', { value: Math.round(entry.bestGain).toLocaleString(nf) })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="content-tabs">
        <button
          className={category === 'TOTAL' ? 'active' : ''}
          onClick={() => setCategory('TOTAL')}
        >
          {t('tabs.total')}
        </button>
        {CATEGORIES.map((entry) => {
          const occupied = hasDifficulty(entry)
            ? RAID_DIFFICULTIES.some((d) => filled.has(contentKey(entry, d)))
            : filled.has(contentKey(entry, null))
          return (
            <button
              key={entry}
              className={category === entry ? 'active' : ''}
              onClick={() => setCategory(entry)}
            >
              {t(`content.${entry}`)}
              {occupied && <i className="dot" />}
            </button>
          )
        })}
      </div>

      {category !== 'TOTAL' && hasDifficulty(category) && (
        <div className="content-tabs sub">
          {RAID_DIFFICULTIES.map((entry) => (
            <button
              key={entry}
              className={difficulty === entry ? 'active' : ''}
              onClick={() => setDifficulty(entry)}
            >
              {t(`difficulty.${entry}`)}
              {filled.has(contentKey('RAID', entry)) && <i className="dot" />}
            </button>
          ))}
        </div>
      )}

      {scopedReports.length === 0 ? (
        <p className="faint">{t('tabs.empty', { content: scopeLabel })}</p>
      ) : (
        <>
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
            <BySlot hub={hub} slots={scopedSlots} nf={nf} showContent={scope === null} />
          ) : (
            scopedReports.map((report) => (
              <ReportBlock key={report.reportId} hub={hub} report={report} nf={nf} />
            ))
          )}
        </>
      )}
    </section>
  )
}

function BySlot({
  hub,
  slots,
  nf,
  showContent
}: {
  hub: Hub
  slots: CharacterFocus['bySlot']
  nf: string
  showContent: boolean
}): JSX.Element {
  const { t } = hub
  const visible = slots.filter((slot) => slot.upgrades.length > 0)

  if (!visible.length) return <p className="faint">{t('dropt.bySlot.empty')}</p>

  return (
    <div>
      {visible.map((slot) => {
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
                <UpgradeRow
                  key={`${upgrade.itemId}-${upgrade.itemName}`}
                  hub={hub}
                  upgrade={upgrade}
                  content={showContent ? t(upgrade.labelKey) : undefined}
                  nf={nf}
                />
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
  content,
  nf
}: {
  hub: Hub
  upgrade: DroptimizerUpgrade
  content?: string
  nf: string
}): JSX.Element {
  const { t } = hub

  const source = upgrade.boss
    ? upgrade.instance
      ? `${upgrade.boss} — ${upgrade.instance}`
      : upgrade.boss
    : upgrade.instance || t('dropt.source.unknown')

  return (
    <div className="upgrade-row">
      <ItemIcon url={upgrade.iconUrl} />
      <div>
        <a onClick={() => void window.api.system.openExternal(upgrade.wowheadUrl)}>
          {upgrade.itemName}
        </a>
        <div className="src" title={source}>
          {source}
          {content ? ` · ${content}` : ''}
        </div>
      </div>
      <div className="gain">
        +{upgrade.gainPct.toFixed(2)}%
        <div className="gain-dps">
          {t('dropt.gainDps', { value: Math.round(upgrade.gain).toLocaleString(nf) })}
        </div>
      </div>
    </div>
  )
}

function ReportBlock({
  hub,
  report,
  nf
}: {
  hub: Hub
  report: DroptimizerReport
  nf: string
}): JSX.Element {
  const { t } = hub
  const [open, setOpen] = useState(false)
  const shown = open ? report.upgrades : report.upgrades.slice(0, 8)

  const move = (category: ContentCategory, difficulty: RaidDifficulty | null): void => {
    void hub.run(() => window.api.reports.recategorize(report.reportId, category, difficulty))
  }

  return (
    <div>
      <div className="report-head">
        <div className="title">
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={report.category}
              onChange={(e) => {
                const next = e.target.value as ContentCategory
                move(next, hasDifficulty(next) ? report.difficulty ?? 'HEROIC' : null)
              }}
            >
              {CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {t(`content.${entry}`)}
                </option>
              ))}
            </select>
            {hasDifficulty(report.category) && (
              <select
                value={report.difficulty ?? 'HEROIC'}
                onChange={(e) => move(report.category, e.target.value as RaidDifficulty)}
              >
                {RAID_DIFFICULTIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(`difficulty.${entry}`)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="faint" title={report.contentLabel}>
            {t('dropt.report.baseline', { dps: report.baselineDps.toLocaleString(nf) })} ·{' '}
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
        <UpgradeRow
          key={`${upgrade.itemId}-${upgrade.itemName}`}
          hub={hub}
          upgrade={upgrade}
          nf={nf}
        />
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
