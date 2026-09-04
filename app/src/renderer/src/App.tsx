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
            Personnage
          </button>
          <button className={tab === 'export' ? 'active' : ''} onClick={() => setTab('export')}>
            Export addon
          </button>
          <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
            Réglages
          </button>
        </div>

        {hub.banner && (
          <div
            className={hub.banner.kind === 'ok' ? 'ok-box' : 'error-box'}
            onClick={() => hub.setBanner(null)}
            title="Cliquer pour masquer"
          >
            {hub.banner.text}
          </div>
        )}

        {tab === 'character' &&
          (selected ? (
            <CharacterView hub={hub} character={selected} />
          ) : (
            <div className="empty">
              <h3>Aucun personnage</h3>
              <p>
                Connecte-toi à Battle.net dans <strong>Réglages</strong>, puis lance une
                synchronisation : tous les persos du compte apparaîtront ici sans avoir à te
                connecter en jeu sur chacun.
              </p>
            </div>
          ))}

        {tab === 'export' && <ExportView hub={hub} />}
        {tab === 'settings' && <SettingsView hub={hub} />}
      </main>
    </div>
  )
}
