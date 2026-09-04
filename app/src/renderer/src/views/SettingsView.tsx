import { useEffect, useState } from 'react'
import type { Region, WowInstall } from '@shared/types'
import { LOCALES, REGIONS } from '@shared/types'
import { WOW_FLAVORS } from '@shared/constants'
import type { Hub } from '../state'

export default function SettingsView({ hub }: { hub: Hub }): JSX.Element {
  const settings = hub.settings
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [wowPath, setWowPath] = useState('')
  const [redirect, setRedirect] = useState('')
  const [installs, setInstalls] = useState<WowInstall[] | null>(null)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    if (!settings) return
    setClientId(settings.clientId)
    setClientSecret(settings.clientSecret)
    setWowPath(settings.wowPath ?? '')
  }, [settings?.clientId, settings?.clientSecret, settings?.wowPath])

  useEffect(() => {
    void window.api.settings.redirectUri().then(setRedirect)
  }, [settings?.oauthPort])

  if (!settings) return <p className="faint">Chargement…</p>

  const detect = async (): Promise<void> => {
    setDetecting(true)
    const found = await hub.run(() => window.api.wow.detect())
    setInstalls(found ?? [])
    if (found?.length && !settings.wowPath) {
      await hub.run(() => window.api.wow.setPath(found[0].path))
    }
    setDetecting(false)
  }

  const currentFlavors =
    installs?.find((i) => i.path === settings.wowPath)?.flavors ?? WOW_FLAVORS.map((f) => f.id)

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          Connexion Battle.net
          <span className="hint">une seule fois, puis tous les persos remontent seuls</span>
        </h2>

        <ol className="steps">
          <li>
            Ouvre{' '}
            <a
              onClick={() =>
                void window.api.system.openExternal('https://develop.battle.net/access/clients')
              }
            >
              develop.battle.net/access/clients
            </a>{' '}
            et clique sur <strong>Create Client</strong> (connexion avec ton compte Battle.net).
          </li>
          <li>
            Renseigne un nom quelconque et, dans <strong>Redirect URLs</strong>, colle exactement :{' '}
            <strong>{redirect || '…'}</strong>
          </li>
          <li>
            Copie le <strong>Client ID</strong> et le <strong>Client Secret</strong> générés dans les
            champs ci-dessous, puis clique sur <strong>Se connecter</strong>.
          </li>
        </ol>

        <div className="form-row">
          <label>Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onBlur={() => void hub.saveSettings({ clientId: clientId.trim() })}
            placeholder="ex : 3f1c2b9e8d4a…"
          />
        </div>
        <div className="form-row">
          <label>Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            onBlur={() => void hub.saveSettings({ clientSecret: clientSecret.trim() })}
            placeholder="ex : Qa7…"
          />
          <div className="desc">
            Stocké chiffré sur cette machine (DPAPI Windows) et envoyé uniquement à Blizzard.
          </div>
        </div>
        <div className="form-row">
          <label>Port de redirection</label>
          <input
            type="number"
            value={settings.oauthPort}
            onChange={(e) =>
              void hub.saveSettings({ oauthPort: Number(e.target.value) || 8710 })
            }
          />
          <div className="desc">
            À changer seulement si le port {settings.oauthPort} est déjà pris. Pense à mettre à
            jour la Redirect URL sur develop.battle.net.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          {hub.auth.connected ? (
            <>
              <span className="badge green">
                Connecté {hub.auth.battletag ? `— ${hub.auth.battletag}` : ''}
              </span>
              {hub.auth.expiresAt && (
                <span className="faint">
                  session valide jusqu'au {new Date(hub.auth.expiresAt).toLocaleString('fr-FR')}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => void hub.logout()}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              <button
                className="btn primary"
                onClick={() => void hub.login()}
                disabled={!clientId || !clientSecret}
              >
                Se connecter avec Battle.net
              </button>
              <span className="faint">
                L'autorisation s'ouvre dans ton navigateur, comme sur Raider.IO.
              </span>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Compte et synchronisation</h2>
        <div className="form-row">
          <label>Région</label>
          <select
            value={settings.region}
            onChange={(e) => {
              const region = e.target.value as Region
              void hub.saveSettings({ region, locale: LOCALES[region][0] })
            }}
          >
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Langue des données</label>
          <select
            value={settings.locale}
            onChange={(e) => void hub.saveSettings({ locale: e.target.value })}
          >
            {LOCALES[settings.region].map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Niveau minimum</label>
          <input
            type="number"
            min={1}
            max={80}
            value={settings.minLevel}
            onChange={(e) => void hub.saveSettings({ minLevel: Number(e.target.value) || 1 })}
          />
          <div className="desc">
            Les persos sous ce niveau sont ignorés : ça évite de synchroniser 40 banques de guilde.
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Dossier World of Warcraft</h2>
        <div className="form-row">
          <label>Chemin</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={wowPath}
              placeholder="C:\Program Files (x86)\World of Warcraft"
              onChange={(e) => setWowPath(e.target.value)}
              onBlur={() => {
                // Validé seulement à la sortie du champ : chaque frappe
                // déclencherait sinon une écriture disque et un rechargement.
                if (wowPath.trim() && wowPath !== settings.wowPath) {
                  void hub.run(() => window.api.wow.setPath(wowPath))
                }
              }}
            />
            <button className="btn" onClick={() => void detect()} disabled={detecting}>
              {detecting ? 'Recherche…' : 'Détecter'}
            </button>
            <button
              className="btn"
              onClick={async () => {
                const install = await hub.run(() => window.api.wow.browse())
                if (install) await hub.run(() => window.api.wow.setPath(install.path))
              }}
            >
              Parcourir…
            </button>
          </div>
        </div>

        {installs && installs.length > 1 && (
          <div className="form-row">
            <label>Installations trouvées</label>
            <select
              value={settings.wowPath ?? ''}
              onChange={(e) => void hub.run(() => window.api.wow.setPath(e.target.value))}
            >
              {installs.map((install) => (
                <option key={install.path} value={install.path}>
                  {install.path}
                </option>
              ))}
            </select>
          </div>
        )}
        {installs && installs.length === 0 && (
          <p className="faint">
            Aucune installation détectée automatiquement — indique le chemin à la main (le dossier
            qui contient <strong>_retail_</strong>).
          </p>
        )}

        <div className="form-row">
          <label>Version du jeu</label>
          <select
            value={settings.wowFlavor}
            onChange={(e) => void hub.saveSettings({ wowFlavor: e.target.value })}
          >
            {WOW_FLAVORS.filter((f) => currentFlavors.includes(f.id)).map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.label} ({flavor.id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Export automatique</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={settings.autoExport}
              onChange={(e) => void hub.saveSettings({ autoExport: e.target.checked })}
            />
            <span className="faint">
              Réécrit les données de l'addon après chaque synchronisation.
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
