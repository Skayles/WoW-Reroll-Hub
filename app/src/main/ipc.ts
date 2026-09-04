import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'node:path'
import type {
  AppData,
  AppSettings,
  AuthStatus,
  DroptimizerReport,
  ExportResult,
  JournalStatus,
  SyncResult,
  WowInstall
} from '@shared/types'
import { store } from './store'
import { t } from './i18n'
import { ensureIndex, journalStatus } from './journal'
import { authorize, clearToken, getToken, redirectUri } from './oauth'
import { syncAll, syncOne } from './sync'
import { detectInstalls, flavorsIn, normalizeWowRoot } from './wowPath'
import { exportToAddon, exportToFile, previewExport } from './exporter'
import {
  buildReport,
  extractReportId,
  fetchReport,
  flushItemCache,
  parseRawJson,
  refreshReport
} from './raidbots'

/**
 * Enveloppe uniforme : toute erreur du main revient au renderer sous forme
 * `{ ok: false, error }` plutôt que sous forme d'exception IPC illisible.
 */
function handle<T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) }
    } catch (err) {
      return { ok: false, error: (err as Error).message || t('err.unknown') }
    }
  })
}

/**
 * Re-résout les libellés de tous les rapports enregistrés.
 *
 * Les noms d'objets et de boss sont figés dans le rapport au moment de
 * l'import : changer la langue des données ne suffit donc pas, il faut les
 * redemander à Blizzard.
 */
async function refreshAllReports(): Promise<number> {
  const reports = Object.values(store.getData().reports)
  for (const report of reports) {
    const refreshed = await refreshReport(report)
    store.mutate((data) => {
      data.reports[refreshed.reportId] = refreshed
    })
  }
  flushItemCache()
  return reports.length
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  // -- réglages ------------------------------------------------------------

  handle<AppSettings>('settings:get', () => store.getPublicSettings())

  handle<AppSettings>('settings:save', (patch: Partial<AppSettings>) => {
    const previousLocale = store.getSettings().locale
    const saved = store.saveSettings(patch)

    // Changer la langue des données rend les libellés déjà enregistrés
    // obsolètes. On les rafraîchit en tâche de fond plutôt que de faire
    // attendre l'enregistrement du réglage.
    if (patch.locale && patch.locale !== previousLocale) {
      void refreshAllReports()
        .then((count) => getWindow()?.webContents.send('reports:refreshed', count))
        .catch(() => getWindow()?.webContents.send('reports:refreshed', -1))
    }
    return saved
  })

  handle<string>('settings:redirectUri', () => redirectUri(store.getSettings().oauthPort))

  // -- authentification ----------------------------------------------------

  handle<AuthStatus>('auth:status', () => {
    const token = getToken()
    return {
      connected: Boolean(token),
      battletag: token?.battletag ?? null,
      expiresAt: token?.expiresAt ?? null
    }
  })

  handle<AuthStatus>('auth:login', async () => {
    const token = await authorize()
    return { connected: true, battletag: token.battletag, expiresAt: token.expiresAt }
  })

  handle<AuthStatus>('auth:logout', () => {
    clearToken()
    return { connected: false, battletag: null, expiresAt: null }
  })

  // -- données -------------------------------------------------------------

  handle<AppData>('data:get', () => store.getData())

  handle<SyncResult>('sync:all', async () => {
    const result = await syncAll(getWindow())
    flushItemCache()
    if (result.ok && store.getSettings().autoExport && store.getSettings().wowPath) {
      // L'auto-export ne doit jamais faire échouer la synchro : on l'annonce
      // au renderer sans propager l'erreur.
      const exported = exportToAddon()
      getWindow()?.webContents.send('export:auto', exported)
    }
    return result
  })

  handle('sync:one', (id: string) => syncOne(id))

  // -- gestion de la liste -------------------------------------------------

  handle<AppData>('char:toggleHidden', (id: string) =>
    store.mutate((data) => {
      const index = data.hidden.indexOf(id)
      if (index >= 0) data.hidden.splice(index, 1)
      else data.hidden.push(id)
    })
  )

  handle<AppData>('char:togglePinned', (id: string) =>
    store.mutate((data) => {
      const index = data.pinned.indexOf(id)
      if (index >= 0) data.pinned.splice(index, 1)
      else data.pinned.push(id)
    })
  )

  handle<AppData>('char:setNote', (id: string, note: string) =>
    store.mutate((data) => {
      if (note.trim()) data.notes[id] = note
      else delete data.notes[id]
    })
  )

  handle<AppData>('char:remove', (id: string) =>
    store.mutate((data) => {
      delete data.characters[id]
      delete data.notes[id]
      for (const [reportId, report] of Object.entries(data.reports)) {
        if (report.characterId === id) delete data.reports[reportId]
      }
    })
  )

  // -- droptimizer ---------------------------------------------------------

  handle<DroptimizerReport>('report:importUrl', async (input: string, characterId: string) => {
    const reportId = extractReportId(input)
    if (!reportId) throw new Error(t('err.badReportLink'))
    const raw = await fetchReport(reportId)
    const report = await buildReport(raw, reportId, characterId)
    flushItemCache()
    store.mutate((data) => {
      data.reports[report.reportId] = report
    })
    return report
  })

  handle<DroptimizerReport>('report:importJson', async (text: string, characterId: string) => {
    const raw = parseRawJson(text)
    const reportId = `local-${Date.now().toString(36)}`
    const report = await buildReport(raw, reportId, characterId)
    flushItemCache()
    store.mutate((data) => {
      data.reports[report.reportId] = report
    })
    return report
  })

  handle<number>('report:refreshAll', () => refreshAllReports())

  handle<AppData>('report:remove', (reportId: string) =>
    store.mutate((data) => {
      delete data.reports[reportId]
    })
  )

  handle<AppData>('report:retag', (reportId: string, tag: string) =>
    store.mutate((data) => {
      const report = data.reports[reportId]
      if (report) report.contentTag = tag.trim() || report.contentLabel
    })
  )

  // -- installation WoW ----------------------------------------------------

  handle<WowInstall[]>('wow:detect', () => detectInstalls())

  handle<WowInstall | null>('wow:browse', async () => {
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, {
          title: t('settings.wow'),
          properties: ['openDirectory']
        })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })

    if (result.canceled || !result.filePaths[0]) return null
    const normalized = normalizeWowRoot(result.filePaths[0])
    if (!normalized) {
      throw new Error(t('err.notWowFolder'))
    }
    return { path: normalized, flavors: flavorsIn(normalized) }
  })

  handle<WowInstall>('wow:setPath', (input: string) => {
    const normalized = normalizeWowRoot(input)
    if (!normalized) throw new Error(t('err.badPath'))
    const flavors = flavorsIn(normalized)
    // On ne conserve la saveur choisie que si elle existe dans cette
    // installation ; sinon on retombe sur la première disponible.
    const current = store.getSettings().wowFlavor
    store.saveSettings({
      wowPath: normalized,
      wowFlavor: flavors.includes(current) ? current : flavors[0]
    })
    return { path: normalized, flavors }
  })

  // -- index du butin ------------------------------------------------------

  handle<JournalStatus>('journal:status', () => journalStatus())

  handle<JournalStatus>('journal:rebuild', async () => {
    await ensureIndex(true)
    return journalStatus()
  })

  // -- export --------------------------------------------------------------

  handle<ExportResult>('export:run', () => exportToAddon())

  handle<string>('export:preview', () => previewExport())

  handle<ExportResult>('export:saveAs', async () => {
    const win = getWindow()
    const options = {
      title: t('export.saveAs'),
      defaultPath: 'Export.lua',
      filters: [{ name: 'Lua', extensions: ['lua'] }]
    }
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { ok: false, error: t('common.cancel') }
    return exportToFile(result.filePath)
  })

  // -- système -------------------------------------------------------------

  handle('shell:openExternal', (url: string) => {
    // Liste blanche : on n'ouvre que du http(s), jamais un chemin local arbitraire.
    if (!/^https?:\/\//i.test(url)) throw new Error(t('err.urlRefused'))
    return shell.openExternal(url)
  })

  handle('shell:revealPath', (target: string) => {
    shell.showItemInFolder(path.normalize(target))
  })
}
