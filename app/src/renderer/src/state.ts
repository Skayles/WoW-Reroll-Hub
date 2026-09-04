import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AppData,
  AppSettings,
  AuthStatus,
  CharacterDetail,
  SyncProgress,
  SyncResult
} from '@shared/types'

const EMPTY_DATA: AppData = {
  characters: {},
  hidden: [],
  pinned: [],
  reports: {},
  notes: {},
  lastSyncAt: null
}

export interface Hub {
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
      setBanner(
        result.ok
          ? { kind: 'ok', text: `Addon mis à jour (${result.characterCount} personnages).` }
          : { kind: 'error', text: `Export automatique échoué : ${result.error}` }
      )
    })

    return () => {
      offProgress()
      offExport()
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
    setBanner({ kind: 'ok', text: 'Autorisation ouverte dans le navigateur…' })
    const status = await run(() => window.api.auth.login())
    if (status) setBanner({ kind: 'ok', text: `Connecté en tant que ${status.battletag ?? 'compte Battle.net'}.` })
  }, [run])

  const logout = useCallback(async () => {
    await run(() => window.api.auth.logout(), 'Déconnecté.')
  }, [run])

  const syncAll = useCallback(async () => {
    setBanner(null)
    const result = await run<SyncResult>(() => window.api.sync.all())
    if (!result) return
    if (!result.ok) {
      setBanner({ kind: 'error', text: result.error ?? 'Synchronisation échouée.' })
      return
    }
    const failedNote = result.failed.length
      ? ` ${result.failed.length} en échec : ${result.failed
          .slice(0, 3)
          .map((f) => f.name)
          .join(', ')}${result.failed.length > 3 ? '…' : ''}`
      : ''
    setBanner({
      kind: result.failed.length ? 'error' : 'ok',
      text: `${result.characterCount} personnages synchronisés.${failedNote}`
    })
  }, [run])

  const characters = useMemo(() => {
    const pinned = new Set(data.pinned)
    return Object.values(data.characters).sort((a, b) => {
      const pinDiff = Number(pinned.has(b.id)) - Number(pinned.has(a.id))
      if (pinDiff) return pinDiff
      return b.equippedItemLevel - a.equippedItemLevel || a.name.localeCompare(b.name)
    })
  }, [data])

  return {
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
