import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppData,
  AppSettings,
  AuthStatus,
  CharacterDetail,
  DroptimizerReport,
  ExportResult,
  IpcResponse,
  JournalStatus,
  SyncProgress,
  SyncResult,
  WowInstall
} from '@shared/types'
import type { ContentCategory, RaidDifficulty } from '@shared/content'

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const response = (await ipcRenderer.invoke(channel, ...args)) as IpcResponse<T>
  if (!response?.ok) throw new Error(response?.error ?? 'Erreur inconnue.')
  return response.data as T
}

const api = {
  settings: {
    get: () => call<AppSettings>('settings:get'),
    save: (patch: Partial<AppSettings>) => call<AppSettings>('settings:save', patch),
    redirectUri: () => call<string>('settings:redirectUri')
  },
  auth: {
    status: () => call<AuthStatus>('auth:status'),
    login: () => call<AuthStatus>('auth:login'),
    logout: () => call<AuthStatus>('auth:logout')
  },
  data: {
    get: () => call<AppData>('data:get')
  },
  sync: {
    all: () => call<SyncResult>('sync:all'),
    one: (id: string) => call<CharacterDetail>('sync:one', id),
    onProgress: (handler: (progress: SyncProgress) => void) => {
      const listener = (_e: unknown, progress: SyncProgress): void => handler(progress)
      ipcRenderer.on('sync:progress', listener)
      return () => ipcRenderer.removeListener('sync:progress', listener)
    }
  },
  characters: {
    toggleHidden: (id: string) => call<AppData>('char:toggleHidden', id),
    togglePinned: (id: string) => call<AppData>('char:togglePinned', id),
    setNote: (id: string, note: string) => call<AppData>('char:setNote', id, note),
    remove: (id: string) => call<AppData>('char:remove', id)
  },
  reports: {
    importUrl: (
      input: string,
      characterId: string,
      forced?: { category: ContentCategory; difficulty: RaidDifficulty | null }
    ) => call<DroptimizerReport>('report:importUrl', input, characterId, forced),
    importJson: (
      text: string,
      characterId: string,
      forced?: { category: ContentCategory; difficulty: RaidDifficulty | null }
    ) => call<DroptimizerReport>('report:importJson', text, characterId, forced),
    remove: (reportId: string) => call<AppData>('report:remove', reportId),
    recategorize: (
      reportId: string,
      category: ContentCategory,
      difficulty: RaidDifficulty | null
    ) => call<AppData>('report:recategorize', reportId, category, difficulty),
    refreshAll: () => call<number>('report:refreshAll'),
    reimportStale: (force?: boolean) => call<number>('report:reimportStale', force),
    onRefreshed: (handler: (count: number) => void) => {
      const listener = (_e: unknown, count: number): void => handler(count)
      ipcRenderer.on('reports:refreshed', listener)
      return () => ipcRenderer.removeListener('reports:refreshed', listener)
    }
  },
  wow: {
    detect: () => call<WowInstall[]>('wow:detect'),
    browse: () => call<WowInstall | null>('wow:browse'),
    setPath: (input: string) => call<WowInstall>('wow:setPath', input)
  },
  media: {
    backfill: () => call<number>('media:backfill')
  },
  journal: {
    status: () => call<JournalStatus>('journal:status'),
    rebuild: () => call<JournalStatus>('journal:rebuild')
  },
  exporter: {
    run: () => call<ExportResult>('export:run'),
    preview: () => call<string>('export:preview'),
    saveAs: () => call<ExportResult>('export:saveAs'),
    onAuto: (handler: (result: ExportResult) => void) => {
      const listener = (_e: unknown, result: ExportResult): void => handler(result)
      ipcRenderer.on('export:auto', listener)
      return () => ipcRenderer.removeListener('export:auto', listener)
    }
  },
  system: {
    openExternal: (url: string) => call<void>('shell:openExternal', url),
    revealPath: (target: string) => call<void>('shell:revealPath', target)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
