import { useEffect, useMemo, useState } from 'react'
import type { CharacterDetail } from '@shared/types'
import {
  classColor,
  FACTION_LABELS,
  qualityColor,
  ROLE_LABELS,
  SLOT_ORDER
} from '@shared/constants'
import { computeFocus, findWeakSlots } from '@shared/focus'
import type { Hub } from '../state'
import Droptimizer from '../components/Droptimizer'

interface Props {
  hub: Hub
  character: CharacterDetail
}

export default function CharacterView({ hub, character }: Props): JSX.Element {
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
            {character.role ? ` · ${ROLE_LABELS[character.role]}` : ''} ·{' '}
            {FACTION_LABELS[character.faction]}
            {character.guild ? ` · <${character.guild}>` : ''}
          </div>
        </div>
        <div className="spacer" />
        <div className="header-actions">
          <button
            className="btn small"
            onClick={() => void hub.run(() => window.api.characters.togglePinned(character.id))}
          >
            {isPinned ? 'Désépingler' : 'Épingler'}
          </button>
          <button
            className="btn small"
            onClick={() => void hub.run(() => window.api.characters.toggleHidden(character.id))}
            title="Un perso masqué reste en base mais sort de la liste et de l'export addon."
          >
            {isHidden ? 'Réafficher' : 'Masquer'}
          </button>
          <button
            className="btn small"
            onClick={() =>
              void hub.run(
                () => window.api.sync.one(character.id),
                `${character.name} resynchronisé.`
              )
            }
          >
            Resynchroniser
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Ilvl équipé" value={character.equippedItemLevel || '—'} />
        <Kpi label="Ilvl max" value={character.averageItemLevel || '—'} />
        <Kpi label="Score M+" value={character.mythicPlus?.rating || '—'} />
        <Kpi label="Set de tier" value={`${character.tierPieces}/4`} />
        <Kpi label="Niveau" value={character.level} />
        <Kpi
          label="Focus conseillé"
          value={focus.recommended ? focus.recommended.contentTag : '—'}
          small
        />
      </div>

      <Droptimizer hub={hub} character={character} reports={reports} focus={focus} />

      <div className="grid-2">
        <section className="panel">
          <h2>
            Équipement
            <span className="hint">{gear.length} pièces</span>
          </h2>
          <div className="gear-list">
            {gear.map((item) => (
              <div className="gear-row" key={item.slot}>
                <div className="slot">{item.slotLabel}</div>
                <div>
                  <div
                    className="item-name"
                    style={{ color: qualityColor(item.quality) }}
                    title={item.name}
                  >
                    <a
                      onClick={() =>
                        void window.api.system.openExternal(
                          `https://www.wowhead.com/fr/item=${item.itemId}`
                        )
                      }
                      style={{ color: 'inherit' }}
                    >
                      {item.name || `Objet ${item.itemId}`}
                    </a>
                  </div>
                  {item.enchantment && <div className="faint">{item.enchantment}</div>}
                </div>
                <div className="flags">
                  {item.missingEnchant && <span className="flag warn">sans ench.</span>}
                  {item.emptySockets > 0 && (
                    <span className="flag warn">{item.emptySockets} châsse vide</span>
                  )}
                  {item.setBonusId !== null && <span className="flag tier">tier</span>}
                  <span className="lvl">{item.itemLevel || '—'}</span>
                </div>
              </div>
            ))}
            {!gear.length && <p className="faint">Aucun équipement remonté par l'API.</p>}
          </div>
        </section>

        <div className="stack">
          <section className="panel">
            <h2>Statistiques</h2>
            {character.stats ? (
              <div className="stats-grid">
                {character.stats.primary && (
                  <Stat k={character.stats.primary.name} v={character.stats.primary.value} />
                )}
                <Stat k="Endurance" v={character.stats.stamina} />
                <Stat k="Points de vie" v={character.stats.health} />
                <Stat k="Critique" v={character.stats.crit} suffix="%" />
                <Stat k="Hâte" v={character.stats.haste} suffix="%" />
                <Stat k="Maîtrise" v={character.stats.mastery} suffix="%" />
                <Stat k="Polyvalence" v={character.stats.versatility} suffix="%" />
                <Stat k="Armure" v={character.stats.armor} />
                {character.role === 'TANK' && (
                  <>
                    <Stat k="Esquive" v={character.stats.dodge} suffix="%" />
                    <Stat k="Parade" v={character.stats.parry} suffix="%" />
                    <Stat k="Blocage" v={character.stats.block} suffix="%" />
                  </>
                )}
              </div>
            ) : (
              <p className="faint">Statistiques indisponibles pour ce personnage.</p>
            )}
          </section>

          <section className="panel">
            <h2>
              À corriger
              <span className="hint">gains gratuits, avant tout farm</span>
            </h2>
            {focus.gearIssues.length || weakSlots.length ? (
              <ul className="issues" style={{ margin: 0, paddingLeft: 18 }}>
                {focus.gearIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
                {weakSlots.length > 0 && (
                  <li>Slots en retard : {weakSlots.join(', ')}</li>
                )}
              </ul>
            ) : (
              <p className="faint">Rien à signaler : enchantements et châsses sont à jour.</p>
            )}
          </section>

          {character.raids.length > 0 && (
            <section className="panel">
              <h2>Progression raid</h2>
              {character.raids.map((raid) => (
                <div className="stat-cell" key={`${raid.raid}-${raid.difficulty}`} style={{ marginBottom: 4 }}>
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
              <h2>Métiers</h2>
              {character.professions.map((profession) => (
                <div className="stat-cell" key={profession.name} style={{ marginBottom: 4 }}>
                  <span className="k">{profession.name}</span>
                  <span className="v">
                    {profession.skill}/{profession.maxSkill || '—'}
                  </span>
                </div>
              ))}
            </section>
          )}

          <section className="panel">
            <h2>
              Note
              <span className="hint">exportée vers l'addon</span>
            </h2>
            <textarea
              rows={3}
              value={note}
              placeholder="Ex : reroll main si tier 4p, sinon rester alt M+"
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
          Synchro partielle — {character.warnings.join(' · ')}
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
        {suffix === '%' ? v.toFixed(2) : Math.round(v).toLocaleString('fr-FR')}
        {suffix ?? ''}
      </span>
    </div>
  )
}
