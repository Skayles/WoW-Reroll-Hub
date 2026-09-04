import { useEffect, useState } from 'react'
import { useHub } from './state'
import Roster from './views/Roster'
import CharacterView from './views/CharacterView'
import SettingsView from './views/SettingsView'
import ExportView from './views/ExportView'

type Tab = 'character' | 'export' | 'settings'

export default function App(): JSX.Element {
  const hub = useHub()
  const [tab, setTab] = useState<Tab>('character')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Sélection par défaut : le premier perso de la liste dès qu'elle existe, et
  // bascule automatique vers les réglages tant que rien n'est configuré.
  useEffect(() => {
    if (hub.loading) return
    if (!selectedId && hub.characters.length) {
      setSelectedId(hub.characters[0].id)
    }
    if (!hub.characters.length && !hub.auth.connected) {
      setTab('settings')
    }
  }, [hub.loading, hub.characters, hub.auth.connected, selectedId])

  const selected = selectedId ? hub.data.characters[selectedId] ?? null : null
  const { t } = hub

  return (
    <div className="app">
      <Roster
        hub={hub}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id)
          setTab('character')
        }}
      />

      <main className="main">
        <div className="main-tabs">
          <button
            className={tab === 'character' ? 'active' : ''}
            onClick={() => setTab('character')}
          >
            {t('tab.character')}
          </button>
          <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>
            {t('tab.export')}
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            {t('tab.settings')}
          </button>
        </div>

        {hub.banner && (
          <div
            className={hub.banner.kind === 'ok' ? 'ok-box' : 'error-box'}
            onClick={() => hub.setBanner(null)}
            title={t('common.close')}
          >
            {hub.banner.text}
          </div>
        )}

        {tab === 'character' &&
          (selected ? (
            <CharacterView hub={hub} character={selected} />
          ) : (
            <div className="empty">
              <h3>{t('char.empty.title')}</h3>
              <p>{t('char.empty.body')}</p>
            </div>
          ))}

        {tab === 'export' && <ExportView hub={hub} />}
        {tab === 'settings' && <SettingsView hub={hub} />}
      </main>
    </div>
  )
}
