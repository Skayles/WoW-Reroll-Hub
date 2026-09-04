import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppData, AppSettings } from '@shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  clientId: '',
  clientSecret: '',
  region: 'eu',
  locale: 'fr_FR',
  minLevel: 10,
  wowPath: null,
  wowFlavor: '_retail_',
  oauthPort: 8710,
  autoExport: true
}

const DEFAULT_DATA: AppData = {
  characters: {},
  hidden: [],
  pinned: [],
  reports: {},
  notes: {},
  lastSyncAt: null
}

/**
 * Persistance sur disque dans le userData d'Electron.
 *
 * Le client secret Battle.net et le jeton d'accès ne sont jamais écrits en
 * clair : ils passent par safeStorage (DPAPI sur Windows). Si le chiffrement
 * n'est pas disponible sur la machine, on refuse de les persister plutôt que de
 * les stocker en clair — l'utilisateur devra les ressaisir à chaque lancement.
 */
class Store {
  private settingsPath = ''
  private dataPath = ''
  private tokenPath = ''
  private settings: AppSettings = { ...DEFAULT_SETTINGS }
  private data: AppData = structuredClone(DEFAULT_DATA)

  init(): void {
    const dir = app.getPath('userData')
    fs.mkdirSync(dir, { recursive: true })
    this.settingsPath = path.join(dir, 'settings.json')
    this.dataPath = path.join(dir, 'data.json')
    this.tokenPath = path.join(dir, 'token.bin')
    this.settings = this.readSettings()
    this.data = this.readData()
  }

  // -- secrets -------------------------------------------------------------

  private encryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  private encrypt(value: string): string | null {
    if (!value) return ''
    if (!this.encryptionAvailable()) return null
    return safeStorage.encryptString(value).toString('base64')
  }

  private decrypt(value: string | null | undefined): string {
    if (!value) return ''
    if (!this.encryptionAvailable()) return ''
    try {
      return safeStorage.decryptString(Buffer.from(value, 'base64'))
    } catch {
      return ''
    }
  }

  // -- settings ------------------------------------------------------------

  private readSettings(): AppSettings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'))
      return {
        ...DEFAULT_SETTINGS,
        ...raw,
        clientSecret: this.decrypt(raw.clientSecretEnc)
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings }
  }

  /** Vue sans secret, sûre à envoyer au renderer. */
  getPublicSettings(): AppSettings {
    return { ...this.settings, clientSecret: this.settings.clientSecret ? '********' : '' }
  }

  saveSettings(patch: Partial<AppSettings>): AppSettings {
    // Le renderer renvoie le masque quand l'utilisateur n'a pas touché au champ.
    if (patch.clientSecret === '********') delete patch.clientSecret
    this.settings = { ...this.settings, ...patch }
    const { clientSecret, ...rest } = this.settings
    const payload: Record<string, unknown> = { ...rest }
    const enc = this.encrypt(clientSecret)
    if (enc !== null) payload.clientSecretEnc = enc
    fs.writeFileSync(this.settingsPath, JSON.stringify(payload, null, 2), 'utf8')
    return this.getPublicSettings()
  }

  // -- jeton d'accès -------------------------------------------------------

  saveToken(token: { accessToken: string; expiresAt: number; battletag: string | null }): void {
    const enc = this.encrypt(JSON.stringify(token))
    if (enc === null) return // chiffrement indisponible : jeton en mémoire seulement
    fs.writeFileSync(this.tokenPath, enc, 'utf8')
  }

  loadToken(): { accessToken: string; expiresAt: number; battletag: string | null } | null {
    try {
      const parsed = JSON.parse(this.decrypt(fs.readFileSync(this.tokenPath, 'utf8')))
      if (!parsed?.accessToken) return null
      return parsed
    } catch {
      return null
    }
  }

  clearToken(): void {
    try {
      fs.rmSync(this.tokenPath, { force: true })
    } catch {
      /* rien à nettoyer */
    }
  }

  // -- données -------------------------------------------------------------

  private readData(): AppData {
    try {
      const raw = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'))
      return { ...structuredClone(DEFAULT_DATA), ...raw }
    } catch {
      return structuredClone(DEFAULT_DATA)
    }
  }

  getData(): AppData {
    return this.data
  }

  /**
   * Écriture atomique : on passe par un fichier temporaire puis un rename, pour
   * qu'une coupure en plein export ne laisse pas un data.json tronqué.
   */
  saveData(): void {
    const tmp = `${this.dataPath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    fs.renameSync(tmp, this.dataPath)
  }

  mutate(fn: (data: AppData) => void): AppData {
    fn(this.data)
    this.saveData()
    return this.data
  }
}

export const store = new Store()
