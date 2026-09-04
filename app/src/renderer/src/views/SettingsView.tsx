import { useCallback, useEffect, useState } from 'react'
import type { JournalStatus, Region, WowInstall } from '@shared/types'
import { LOCALES, REGIONS } from '@shared/types'
import { WOW_FLAVORS } from '@shared/constants'
import { LANGS, type Lang } from '@shared/i18n'
import type { Hub } from '../state'

export default function SettingsView({ hub }: { hub: Hub }): JSX.Element {
  const { t } = hub
  const settings = hub.settings
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [wowPath, setWowPath] = useState('')
  const [redirect, setRedirect] = useState('')
  const [installs, setInstalls] = useState<WowInstall[] | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [journal, setJournal] = useState<JournalStatus | null>(null)
  const [buildingIndex, setBuildingIndex] = useState(false)
  const [refreshingNames, setRefreshingNames] = useState(false)

  useEffect(() => {
    if (!settings) return
    setClientId(settings.clientId)
    setClientSecret(settings.clientSecret)
    setWowPath(settings.wowPath ?? '')
  }, [settings?.clientId, settings?.clientSecret, settings?.wowPath])

  useEffect(() => {
    void window.api.settings.redirectUri().then(setRedirect)
  }, [settings?.oauthPort])

  const refreshJournal = useCallback(() => {
    void window.api.journal.status().then(setJournal).catch(() => setJournal(null))
  }, [])

  useEffect(refreshJournal, [refreshJournal])

  if (!settings) return <p className="faint">{t('common.loading')}</p>

  const detect = async (): Promise<void> => {
    setDetecting(true)
    const found = await hub.run(() => window.api.wow.detect())
    setInstalls(found ?? [])
    if (found?.length && !settings.wowPath) {
      await hub.run(() => window.api.wow.setPath(found[0].path))
    }
    setDetecting(false)
  }

  const rebuildIndex = async (): Promise<void> => {
    setBuildingIndex(true)
    const status = await hub.run(() => window.api.journal.rebuild())
    if (status) {
      setJournal(status)
      hub.setBanner({ kind: 'ok', text: t('settings.journal.done', { count: status.itemCount }) })
    }
    setBuildingIndex(false)
  }

  const currentFlavors =
    installs?.find((i) => i.path === settings.wowPath)?.flavors ?? WOW_FLAVORS.map((f) => f.id)

  return (
    <div className="stack">
      <section className="panel">
        <h2>
          {t('settings.auth')}
          <span className="hint">{t('settings.auth.hint')}</span>
        </h2>

        <ol className="steps">
          <li>
            <a
              onClick={() =>
                void window.api.system.openExternal('https://develop.battle.net/access/clients')
              }
            >
              develop.battle.net/access/clients
            </a>{' '}
            — {t('settings.auth.step1')}
          </li>
          <li>{t('settings.auth.step2', { uri: redirect || '…' })}</li>
          <li>{t('settings.auth.step3')}</li>
        </ol>

        <div className="form-row">
          <label>{t('settings.clientId')}</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onBlur={() => void hub.saveSettings({ clientId: clientId.trim() })}
          />
        </div>
        <div className="form-row">
          <label>{t('settings.clientSecret')}</label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            onBlur={() => void hub.saveSettings({ clientSecret: clientSecret.trim() })}
          />
          <div className="desc">{t('settings.clientSecret.desc')}</div>
        </div>
        <div className="form-row">
          <label>{t('settings.port')}</label>
          <input
            type="number"
            value={settings.oauthPort}
            onChange={(e) => void hub.saveSettings({ oauthPort: Number(e.target.value) || 8710 })}
          />
          <div className="desc">{t('settings.port.desc', { port: settings.oauthPort })}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          {hub.auth.connected ? (
            <>
              <span className="badge green">
                {t('settings.connected')}
                {hub.auth.battletag ? ` — ${hub.auth.battletag}` : ''}
              </span>
              {hub.auth.expiresAt && (
                <span className="faint">
                  {t('settings.sessionUntil', {
                    date: new Date(hub.auth.expiresAt).toLocaleString()
                  })}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={() => void hub.logout()}>
                {t('settings.logout')}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn primary"
                onClick={() => void hub.login()}
                disabled={!clientId || !clientSecret}
              >
                {t('settings.login')}
              </button>
              <span className="faint">{t('settings.login.hint')}</span>
            </>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>{t('settings.account')}</h2>
        <div className="form-row">
          <label>{t('settings.language')}</label>
          <select
            value={settings.language}
            onChange={(e) => void hub.saveSettings({ language: e.target.value as Lang })}
          >
            {LANGS.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
          <div className="desc">{t('settings.language.desc')}</div>
        </div>
        <div className="form-row">
          <label>{t('settings.region')}</label>
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
          <label>{t('settings.locale')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
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
            <button
              className="btn"
              disabled={refreshingNames}
              onClick={async () => {
                setRefreshingNames(true)
                const count = await hub.run(() => window.api.reports.refreshAll())
                if (count !== null) {
                  hub.setBanner({ kind: 'ok', text: t('reports.refreshed', { count }) })
                }
                setRefreshingNames(false)
              }}
              title={t('settings.refreshNames.desc')}
            >
              {refreshingNames ? t('settings.refreshing') : t('settings.refreshNames')}
            </button>
          </div>
          <div className="desc">{t('settings.locale.desc')}</div>
        </div>
        <div className="form-row">
          <label>{t('settings.minLevel')}</label>
          <input
            type="number"
            min={1}
            max={90}
            value={settings.minLevel}
            onChange={(e) => void hub.saveSettings({ minLevel: Number(e.target.value) || 1 })}
          />
          <div className="desc">{t('settings.minLevel.desc')}</div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('settings.about')}</h2>
        <p className="faint" style={{ marginTop: 0 }}>
          {t('settings.disclaimer')}
        </p>
        <a
          onClick={() =>
            void window.api.system.openExternal('https://github.com/Skayles/WoW-Reroll-Hub')
          }
        >
          {t('settings.repo')}
        </a>
      </section>

      <section className="panel">
        <h2>{t('settings.journal')}</h2>
        <p className="faint" style={{ marginTop: 0 }}>
          {t('settings.journal.desc')}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn" onClick={() => void rebuildIndex()} disabled={buildingIndex}>
            {buildingIndex ? t('settings.journal.building') : t('settings.journal.rebuild')}
          </button>
          <span className="faint">
            {journal?.builtAt
              ? t('settings.journal.status', {
                  count: journal.itemCount,
                  date: new Date(journal.builtAt).toLocaleDateString()
                })
              : t('settings.journal.empty')}
          </span>
        </div>
      </section>

      <section className="panel">
        <h2>{t('settings.wow')}</h2>
        <div className="form-row">
          <label>{t('settings.wow.path')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={wowPath}
              placeholder="C:\Program Files (x86)\World of Warcraft"
              onChange={(e) => setWowPath(e.target.value)}
              onBlur={() => {
                if (wowPath.trim() && wowPath !== settings.wowPath) {
                  void hub.run(() => window.api.wow.setPath(wowPath))
                }
              }}
            />
            <button className="btn" onClick={() => void detect()} disabled={detecting}>
              {detecting ? t('settings.wow.detecting') : t('settings.wow.detect')}
            </button>
            <button
              className="btn"
              onClick={async () => {
                const install = await hub.run(() => window.api.wow.browse())
                if (install) await hub.run(() => window.api.wow.setPath(install.path))
              }}
            >
              {t('settings.wow.browse')}
            </button>
          </div>
        </div>

        {installs && installs.length > 1 && (
          <div className="form-row">
            <label>{t('settings.wow.found')}</label>
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
          <p className="faint">{t('settings.wow.notFound')}</p>
        )}

        <div className="form-row">
          <label>{t('settings.wow.flavor')}</label>
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
          <label>{t('settings.autoExport')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={settings.autoExport}
              onChange={(e) => void hub.saveSettings({ autoExport: e.target.checked })}
            />
            <span className="faint">{t('settings.autoExport.desc')}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
