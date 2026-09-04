import { useEffect, useMemo, useState } from 'react'
import type { CharacterDetail, GearIssue } from '@shared/types'
import { classColor, qualityColor, SLOT_ORDER } from '@shared/constants'
import { computeFocus, findWeakSlots } from '@shared/focus'
import type { Translate } from '@shared/i18n'
import type { Hub } from '../state'
import Droptimizer from '../components/Droptimizer'

interface Props {
  hub: Hub
  character: CharacterDetail
}

/** Rend un problème d'équipement structuré dans la langue courante. */
function issueText(issue: GearIssue, t: Translate): string {
  const slot = issue.slot ? t(`slot.${issue.slot}`) : ''
  switch (issue.type) {
    case 'enchant':
      return t('issue.enchant', { slot })
    case 'socket':
      return t(issue.count && issue.count > 1 ? 'issue.sockets' : 'issue.socket', {
        slot,
        count: issue.count ?? 1
      })
    case 'tier':
      return t('issue.tier', { count: issue.count ?? 0 })
    default:
      return ''
  }
}

export default function CharacterView({ hub, character }: Props): JSX.Element {
  const { t } = hub
  const isHidden = hub.data.hidden.includes(character.id)
  const isPinned = hub.data.pinned.includes(character.id)

  const reports = useMemo(
    () => Object.values(hub.data.reports).filter((r) => r.characterId === character.id),
    [hub.data.reports, character.id]
  )
  const focus = useMemo(() => computeFocus(character, reports), [character, reports])
  const weakSlots = useMemo(() => findWeakSlots(character), [character])

  const gear = useMemo(
    () =>
      [...character.gear].sort(
        (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
      ),
    [character.gear]
  )

  const [note, setNote] = useState(hub.data.notes[character.id] ?? '')
  useEffect(() => setNote(hub.data.notes[character.id] ?? ''), [character.id, hub.data.notes])

  const color = classColor(character.classId)

  return (
    <div className="stack">
      <div className="char-header">
        {character.avatarUrl ? (
          <img className="char-avatar" src={character.avatarUrl} alt="" />
        ) : (
          <div className="char-avatar" />
        )}
        <div className="char-title">
          <h1 style={{ color }}>{character.name}</h1>
          <div className="meta">
            {character.realm} ({character.region.toUpperCase()}) ·{' '}
            {character.specName ? `${character.specName} ` : ''}
            {character.className}
            {character.role ? ` · ${t(`role.${character.role}`)}` : ''} ·{' '}
            {t(`faction.${character.faction}`)}
            {character.guild ? ` · <${character.guild}>` : ''}
          </div>
        </div>
        <div className="spacer" />
        <div className="header-actions">
          <button
            className="btn small"
            onClick={() => void hub.run(() => window.api.characters.togglePinned(character.id))}
          >
            {isPinned ? t('char.unpin') : t('char.pin')}
          </button>
          <button
            className="btn small"
            onClick={() => void hub.run(() => window.api.characters.toggleHidden(character.id))}
            title={t('char.hideHint')}
          >
            {isHidden ? t('char.show') : t('char.hide')}
          </button>
          <button
            className="btn small"
            onClick={() =>
              void hub.run(
                () => window.api.sync.one(character.id),
                t('char.resynced', { name: character.name })
              )
            }
          >
            {t('char.resync')}
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi label={t('char.kpi.ilvl')} value={character.equippedItemLevel || t('common.none')} />
        <Kpi label={t('char.kpi.ilvlMax')} value={character.averageItemLevel || t('common.none')} />
        <Kpi label={t('char.kpi.mplus')} value={character.mythicPlus?.rating || t('common.none')} />
        <Kpi label={t('char.kpi.tier')} value={`${character.tierPieces}/4`} />
        <Kpi label={t('char.kpi.level')} value={character.level} />
        <Kpi
          label={t('char.kpi.focus')}
          value={focus.recommended ? focus.recommended.contentTag : t('common.none')}
          small
        />
      </div>

      <Droptimizer hub={hub} character={character} reports={reports} focus={focus} />

      <div className="grid-2">
        <section className="panel">
          <h2>
            {t('char.gear')}
            <span className="hint">{t('char.gear.count', { count: gear.length })}</span>
          </h2>
          <div className="gear-list">
            {gear.map((item) => (
              <div className="gear-row" key={item.slot}>
                <div className="slot">{t(`slot.${item.slot}`)}</div>
                <div>
                  <div
                    className="item-name"
                    style={{ color: qualityColor(item.quality) }}
                    title={item.name}
                  >
                    <a
                      onClick={() =>
                        void window.api.system.openExternal(
                          `https://www.wowhead.com/item=${item.itemId}`
                        )
                      }
                      style={{ color: 'inherit' }}
                    >
                      {item.name || `#${item.itemId}`}
                    </a>
                  </div>
                  {item.enchantment && <div className="faint">{item.enchantment}</div>}
                </div>
                <div className="flags">
                  {item.missingEnchant && (
                    <span className="flag warn">{t('char.gear.noEnchant')}</span>
                  )}
                  {item.emptySockets > 0 && (
                    <span className="flag warn">
                      {t(
                        item.emptySockets > 1
                          ? 'char.gear.emptySockets'
                          : 'char.gear.emptySocket',
                        { count: item.emptySockets }
                      )}
                    </span>
                  )}
                  {item.setBonusId !== null && (
                    <span className="flag tier">{t('char.gear.tier')}</span>
                  )}
                  <span className="lvl">{item.itemLevel || t('common.none')}</span>
                </div>
              </div>
            ))}
            {!gear.length && <p className="faint">{t('char.gear.empty')}</p>}
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <h2>{t('char.stats')}</h2>
            {character.stats ? (
              <div className="stats-grid">
                {character.stats.primary && (
                  <Stat
                    k={t(`stat.${character.stats.primary.name}`)}
                    v={character.stats.primary.value}
                  />
                )}
                <Stat k={t('stat.stamina')} v={character.stats.stamina} />
                <Stat k={t('stat.health')} v={character.stats.health} />
                <Stat k={t('stat.crit')} v={character.stats.crit} suffix="%" />
                <Stat k={t('stat.haste')} v={character.stats.haste} suffix="%" />
                <Stat k={t('stat.mastery')} v={character.stats.mastery} suffix="%" />
                <Stat k={t('stat.versatility')} v={character.stats.versatility} suffix="%" />
                <Stat k={t('stat.armor')} v={character.stats.armor} />
                {character.role === 'TANK' && (
                  <>
                    <Stat k={t('stat.dodge')} v={character.stats.dodge} suffix="%" />
                    <Stat k={t('stat.parry')} v={character.stats.parry} suffix="%" />
                    <Stat k={t('stat.block')} v={character.stats.block} suffix="%" />
                  </>
                )}
              </div>
            ) : (
              <p className="faint">{t('char.stats.empty')}</p>
            )}
          </section>

          <section className="panel">
            <h2>
              {t('char.issues')}
              <span className="hint">{t('char.issues.hint')}</span>
            </h2>
            {focus.gearIssues.length || weakSlots.length ? (
              <ul className="issues" style={{ margin: 0, paddingLeft: 18 }}>
                {focus.gearIssues.map((issue, index) => (
                  <li key={`${issue.type}-${issue.slot ?? index}`}>{issueText(issue, t)}</li>
                ))}
                {weakSlots.length > 0 && (
                  <li>
                    {t('char.issues.weakSlots', {
                      slots: weakSlots
                        .map((weak) => `${t(`slot.${weak.slot}`)} (${weak.itemLevel})`)
                        .join(', ')
                    })}
                  </li>
                )}
              </ul>
            ) : (
              <p className="faint">{t('char.issues.none')}</p>
            )}
          </section>

          {character.raids.length > 0 && (
            <section className="panel">
              <h2>{t('char.raids')}</h2>
              {character.raids.map((raid) => (
                <div
                  className="stat-cell"
                  key={`${raid.raid}-${raid.difficulty}`}
                  style={{ marginBottom: 4 }}
                >
                  <span className="k">
                    {raid.raid} — {raid.difficulty}
                  </span>
                  <span className="v">
                    {raid.killed}/{raid.total}
                  </span>
                </div>
              ))}
            </section>
          )}

          {character.professions.length > 0 && (
            <section className="panel">
              <h2>{t('char.professions')}</h2>
              {character.professions.map((profession) => (
                <div className="stat-cell" key={profession.name} style={{ marginBottom: 4 }}>
                  <span className="k">{profession.name}</span>
                  <span className="v">
                    {profession.skill}/{profession.maxSkill || t('common.none')}
                  </span>
                </div>
              ))}
            </section>
          )}

          <section className="panel">
            <h2>
              {t('char.note')}
              <span className="hint">{t('char.note.hint')}</span>
            </h2>
            <textarea
              rows={3}
              value={note}
              placeholder={t('char.note.placeholder')}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() =>
                void hub.run(() => window.api.characters.setNote(character.id, note))
              }
            />
          </section>
        </div>
      </div>

      {character.warnings.length > 0 && (
        <p className="faint">
          {t('char.partialSync', { details: character.warnings.join(' · ') })}
        </p>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  small
}: {
  label: string
  value: string | number
  small?: boolean
}): JSX.Element {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value" style={small ? { fontSize: 14, lineHeight: 1.5 } : undefined}>
        {value}
      </div>
    </div>
  )
}

function Stat({ k, v, suffix }: { k: string; v: number; suffix?: string }): JSX.Element {
  return (
    <div className="stat-cell">
      <span className="k">{k}</span>
      <span className="v">
        {suffix === '%' ? v.toFixed(2) : Math.round(v).toLocaleString()}
        {suffix ?? ''}
      </span>
    </div>
  )
}
