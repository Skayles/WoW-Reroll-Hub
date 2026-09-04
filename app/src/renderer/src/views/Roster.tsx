import { useMemo, useState } from 'react'
import type { CharacterDetail } from '@shared/types'
import { classColor } from '@shared/constants'
import type { Hub } from '../state'

type SortKey = 'ilvl' | 'name' | 'level' | 'mplus'

interface Props {
  hub: Hub
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function Roster({ hub, selectedId, onSelect }: Props): JSX.Element {
  const { t } = hub
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('ilvl')

  const hidden = useMemo(() => new Set(hub.data.hidden), [hub.data.hidden])
  const pinned = useMemo(() => new Set(hub.data.pinned), [hub.data.pinned])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = (c: CharacterDetail): boolean =>
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      c.realm.toLowerCase().includes(needle) ||
      c.className.toLowerCase().includes(needle) ||
      (c.specName ?? '').toLowerCase().includes(needle)

    const compare = (a: CharacterDetail, b: CharacterDetail): number => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'level':
          return b.level - a.level || b.equippedItemLevel - a.equippedItemLevel
        case 'mplus':
          return (b.mythicPlus?.rating ?? 0) - (a.mythicPlus?.rating ?? 0)
        default:
          return b.equippedItemLevel - a.equippedItemLevel
      }
    }

    const all = hub.characters.filter(matches).sort(compare)
    return {
      pinned: all.filter((c) => pinned.has(c.id) && !hidden.has(c.id)),
      normal: all.filter((c) => !pinned.has(c.id) && !hidden.has(c.id)),
      hidden: all.filter((c) => hidden.has(c.id))
    }
  }, [hub.characters, query, sort, pinned, hidden])

  const syncing = hub.progress?.phase === 'characters' || hub.progress?.phase === 'account'
  const total = hub.characters.length

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <strong>{t('app.name')}</strong>
          <span className="faint">{t('roster.count', { count: total })}</span>
        </div>
        <input
          placeholder={t('roster.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="sidebar-filters">
          <span className="faint" style={{ alignSelf: 'center' }}>
            {hub.auth.connected
              ? hub.auth.battletag ?? t('roster.connected')
              : t('roster.disconnected')}
          </span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="ilvl">{t('roster.sort.ilvl')}</option>
            <option value="mplus">{t('roster.sort.mplus')}</option>
            <option value="level">{t('roster.sort.level')}</option>
            <option value="name">{t('roster.sort.name')}</option>
          </select>
        </div>
      </div>

      <div className="roster">
        {filtered.pinned.length > 0 && (
          <>
            <div className="roster-group">{t('roster.group.pinned')}</div>
            {filtered.pinned.map((c) => (
              <Row key={c.id} c={c} active={c.id === selectedId} onSelect={onSelect} />
            ))}
          </>
        )}

        {filtered.normal.length > 0 && (
          <>
            {filtered.pinned.length > 0 && (
              <div className="roster-group">{t('roster.group.normal')}</div>
            )}
            {filtered.normal.map((c) => (
              <Row key={c.id} c={c} active={c.id === selectedId} onSelect={onSelect} />
            ))}
          </>
        )}

        {filtered.hidden.length > 0 && (
          <>
            <div className="roster-group">{t('roster.group.hidden')}</div>
            {filtered.hidden.map((c) => (
              <Row key={c.id} c={c} active={c.id === selectedId} onSelect={onSelect} muted />
            ))}
          </>
        )}

        {total === 0 && !hub.loading && (
          <p className="faint" style={{ padding: '20px 10px', textAlign: 'center' }}>
            {t('roster.empty')}
          </p>
        )}
      </div>

      <div className="sidebar-footer">
        {syncing && hub.progress && (
          <>
            <div className="faint">
              {hub.progress.label}
              {hub.progress.total > 0 && ` (${hub.progress.current}/${hub.progress.total})`}
            </div>
            <div className="progress">
              <i
                style={{
                  width: hub.progress.total
                    ? `${(hub.progress.current / hub.progress.total) * 100}%`
                    : '10%'
                }}
              />
            </div>
          </>
        )}
        <button
          className="btn primary"
          onClick={() => void hub.syncAll()}
          disabled={syncing || !hub.auth.connected}
          style={{ justifyContent: 'center' }}
        >
          {syncing ? t('roster.syncing') : t('roster.sync')}
        </button>
        {hub.data.lastSyncAt && (
          <div className="faint" style={{ textAlign: 'center' }}>
            {t('roster.lastSync', {
              date: new Date(hub.data.lastSyncAt).toLocaleString()
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function Row({
  c,
  active,
  muted,
  onSelect
}: {
  c: CharacterDetail
  active: boolean
  muted?: boolean
  onSelect: (id: string) => void
}): JSX.Element {
  return (
    <div
      className={`char-row${active ? ' active' : ''}${muted ? ' hidden-char' : ''}`}
      onClick={() => onSelect(c.id)}
    >
      <div className="stripe" style={{ color: classColor(c.classId) }} />
      <div>
        <div className="name" style={{ color: classColor(c.classId) }}>
          {c.name}
        </div>
        <div className="sub">
          {c.realm} · {c.specName ? `${c.specName} ` : ''}
          {c.className} · {c.level}
        </div>
      </div>
      <div className="ilvl">
        {c.equippedItemLevel || '—'}
        {c.mythicPlus?.rating ? <small>{c.mythicPlus.rating} M+</small> : <small>ilvl</small>}
      </div>
    </div>
  )
}
