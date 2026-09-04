import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { store } from './store'
import { registerIpc } from './ipc'
import { flushItemCache } from './raidbots'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: '#0e1116',
    autoHideMenuBar: true,
    title: 'WoW Reroll Hub',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      // Le renderer n'a aucun accès direct à Node : tout passe par le preload.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Les liens externes (Wowhead, Raidbots, Battle.net) partent dans le
  // navigateur système : jamais dans une fenêtre Electron sans garde-fous.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl && url.startsWith(devUrl)) return
    event.preventDefault()
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Une seule instance : deux fenêtres écriraient en concurrence dans data.json.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    store.init()
    registerIpc(() => mainWindow)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  flushItemCache()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => flushItemCache())
