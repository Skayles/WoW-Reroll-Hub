import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AppData,
  AppSettings,
  AuthStatus,
  CharacterDetail,
  SyncProgress,
  SyncResult
} from '@shared/types'
import { translator, type Translate } from '@shared/i18n'

const EMPTY_DATA: AppData = {
  characters: {},
  hidden: [],
  pinned: [],
  reports: {},
  notes: {},
  lastSyncAt: null
}

export interface Hub {
  /** Traducteur figé sur la langue courante des réglages. */
  t: Translate
  data: AppData
  settings: AppSettings | null
  auth: AuthStatus
  progress: SyncProgress | null
  banner: { kind: 'ok' | 'error'; text: string } | null
  loading: boolean
  characters: CharacterDetail[]
  reload: () => Promise<void>
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  syncAll: () => Promise<void>
  setBanner: (banner: { kind: 'ok' | 'error'; text: string } | null) => void
  /** Exécute une action IPC en affichant automatiquement l'erreur éventuelle. */
  run: <T>(action: () => Promise<T>, successMessage?: string) => Promise<T | null>
}

export function useHub(): Hub {
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [auth, setAuth] = useState<AuthStatus>({
    connected: false,
    battletag: null,
    expiresAt: null
  })
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [banner, setBanner] = useState<Hub['banner']>(null)
  const [loading, setLoading] = useState(true)

  // Le traducteur est mémoïsé sur la langue : changer de langue re-rend toute
  // l'interface sans qu'aucun composant n'ait à s'abonner à autre chose.
  const t = useMemo(() => translator(settings?.language ?? 'fr'), [settings?.language])

  // Les écouteurs IPC sont posés une seule fois : ils lisent la langue via
  // cette référence plutôt que de se réabonner à chaque changement de réglage.
  const settingsRef = useRef<AppSettings | null>(null)
  settingsRef.current = settings

  const reload = useCallback(async () => {
    const [nextData, nextSettings, nextAuth] = await Promise.all([
      window.api.data.get(),
      window.api.settings.get(),
      window.api.auth.status()
    ])
    setData(nextData)
    setSettings(nextSettings)
    setAuth(nextAuth)
  }, [])

  useEffect(() => {
    void reload().finally(() => setLoading(false))

    const offProgress = window.api.sync.onProgress(setProgress)
    const offExport = window.api.exporter.onAuto((result) => {
      const translate = translator(settingsRef.current?.language ?? 'fr')
      setBanner(
        result.ok
          ? {
              kind: 'ok',
              text: translate('export.auto.ok', { count: result.characterCount ?? 0 })
            }
          : { kind: 'error', text: translate('export.auto.failed', { error: result.error ?? '' }) }
      )
    })

    const offRefresh = window.api.reports.onRefreshed((count) => {
      const translate = translator(settingsRef.current?.language ?? 'fr')
      setBanner(
        count >= 0
          ? { kind: 'ok', text: translate('reports.refreshed', { count }) }
          : { kind: 'error', text: translate('reports.refreshFailed') }
      )
      void reload()
    })

    return () => {
      offProgress()
      offExport()
      offRefresh()
    }
  }, [reload])

  const run = useCallback(
    async <T,>(action: () => Promise<T>, successMessage?: string): Promise<T | null> => {
      try {
        const result = await action()
        await reload()
        if (successMessage) setBanner({ kind: 'ok', text: successMessage })
        return result
      } catch (err) {
        setBanner({ kind: 'error', text: (err as Error).message })
        return null
      }
    },
    [reload]
  )

  const saveSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      await run(() => window.api.settings.save(patch))
    },
    [run]
  )

  const login = useCallback(async () => {
    setBanner({ kind: 'ok', text: t('settings.opening') })
    const status = await run(() => window.api.auth.login())
    if (status) {
      setBanner({
        kind: 'ok',
        text: t('settings.loggedIn', { battletag: status.battletag ?? 'Battle.net' })
      })
    }
  }, [run, t])

  const logout = useCallback(async () => {
    await run(() => window.api.auth.logout(), t('settings.loggedOut'))
  }, [run, t])

  const syncAll = useCallback(async () => {
    setBanner(null)
    const result = await run<SyncResult>(() => window.api.sync.all())
    if (!result) return
    if (!result.ok) {
      setBanner({ kind: 'error', text: result.error ?? t('sync.failed') })
      return
    }
    const failedNote = result.failed.length
      ? t('sync.failedSome', {
          count: result.failed.length,
          names:
            result.failed.slice(0, 3).map((f) => f.name).join(', ') +
            (result.failed.length > 3 ? '…' : '')
        })
      : ''
    setBanner({
      kind: result.failed.length ? 'error' : 'ok',
      text: t('sync.done', { count: result.characterCount }) + failedNote
    })
  }, [run, t])

  const characters = useMemo(() => {
    const pinned = new Set(data.pinned)
    return Object.values(data.characters).sort((a, b) => {
      const pinDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id))
      if (pinDiff) return pinDiff
      return b.equippedItemLevel - a.equippedItemLevel || a.name.localeCompare(b.name)
    })
  }, [data])

  return {
    t,
    data,
    settings,
    auth,
    progress,
    banner,
    loading,
    characters,
    reload,
    saveSettings,
    login,
    logout,
    syncAll,
    setBanner,
    run
  }
}
