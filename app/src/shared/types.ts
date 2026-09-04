/**
 * Modèle de données partagé entre le process main, le renderer et l'export addon.
 * Toute modification ici doit être répercutée dans addon/RerollHelper/Core.lua
 * (voir EXPORT_SCHEMA_VERSION).
 */

export const EXPORT_SCHEMA_VERSION = 1

export type Region = 'eu' | 'us' | 'kr' | 'tw'

export const REGIONS: Region[] = ['eu', 'us', 'kr', 'tw']

/** Locales acceptées par l'API Blizzard, par région. */
export const LOCALES: Record<Region, string[]> = {
  eu: ['fr_FR', 'en_GB', 'de_DE', 'es_ES', 'it_IT', 'pt_PT', 'ru_RU'],
  us: ['en_US', 'es_MX', 'pt_BR'],
  kr: ['ko_KR'],
  tw: ['zh_TW']
}

// ---------------------------------------------------------------------------
// Configuration / auth
// ---------------------------------------------------------------------------

export interface AppSettings {
  /** Client ID créé sur https://develop.battle.net/access/clients */
  clientId: string
  /** Client secret (chiffré au repos via Electron safeStorage). */
  clientSecret: string
  region: Region
  locale: string
  /** Les persos sous ce niveau ne sont pas synchronisés. */
  minLevel: number
  /** Chemin racine de l'installation WoW (ex: C:\Program Files (x86)\World of Warcraft). */
  wowPath: string | null
  /** Saveur ciblée pour l'export addon (_retail_, _classic_era_...). */
  wowFlavor: string
  /** Port du serveur de redirection OAuth local. */
  oauthPort: number
  /** Ré-écrit le fichier addon automatiquement après chaque synchro. */
  autoExport: boolean
}

export interface AuthStatus {
  connected: boolean
  battletag: string | null
  /** Timestamp ms d'expiration du jeton utilisateur. */
  expiresAt: number | null
}

// ---------------------------------------------------------------------------
// Personnages
// ---------------------------------------------------------------------------

export interface CharacterRef {
  /** Clé stable : "region:realm-slug:nom-minuscule". */
  id: string
  name: string
  realm: string
  realmSlug: string
  region: Region
  level: number
  className: string
  /** Identifiant de classe Blizzard, sert à la couleur de classe. */
  classId: number
  raceName: string
  faction: 'ALLIANCE' | 'HORDE' | 'NEUTRAL'
  /** Nom du compte WoW (licence) auquel appartient le perso. */
  accountLabel: string
}

export interface GearItem {
  slot: string
  slotLabel: string
  itemId: number
  name: string
  itemLevel: number
  /** POOR | COMMON | UNCOMMON | RARE | EPIC | LEGENDARY | ARTIFACT | HEIRLOOM */
  quality: string
  enchantment: string | null
  sockets: number
  emptySockets: number
  /** True si le slot est enchantable mais ne porte aucun enchantement. */
  missingEnchant: boolean
  setBonusId: number | null
}

export interface CharacterStats {
  health: number
  primary: { name: string; value: number } | null
  stamina: number
  crit: number
  haste: number
  mastery: number
  versatility: number
  armor: number
  dodge: number
  parry: number
  block: number
}

export interface MythicPlusInfo {
  rating: number
  bestRuns: { dungeon: string; level: number; score: number }[]
}

export interface RaidProgressEntry {
  raid: string
  difficulty: string
  killed: number
  total: number
}

export interface ProfessionEntry {
  name: string
  skill: number
  maxSkill: number
}

export interface CharacterDetail extends CharacterRef {
  /** Timestamp ms de la dernière synchro réussie. */
  syncedAt: number
  specName: string | null
  role: 'TANK' | 'HEALER' | 'DAMAGE' | null
  equippedItemLevel: number
  averageItemLevel: number
  guild: string | null
  covenantOrHero: string | null
  gear: GearItem[]
  stats: CharacterStats | null
  mythicPlus: MythicPlusInfo | null
  raids: RaidProgressEntry[]
  professions: ProfessionEntry[]
  /** Nombre de pièces du set de tier équipées (détecté via les bonus de set). */
  tierPieces: number
  avatarUrl: string | null
  /** Erreurs non bloquantes rencontrées pendant la synchro de ce perso. */
  warnings: string[]
}

// ---------------------------------------------------------------------------
// Droptimizer (Raidbots)
// ---------------------------------------------------------------------------

export interface DroptimizerUpgrade {
  itemId: number
  itemName: string
  slot: string
  /** Difficulté / source telle que fournie par le rapport, si disponible. */
  source: string
  dps: number
  /** Gain absolu de dps par rapport au baseline. */
  gain: number
  /** Gain en pourcentage du baseline. */
  gainPct: number
  wowheadUrl: string
}

export interface DroptimizerReport {
  /** Identifiant du rapport Raidbots (segment d'URL). */
  reportId: string
  characterId: string
  /** Nom du contenu simulé : "Manaforge Omega - Mythique", "Donjons +12"... */
  contentLabel: string
  /** Étiquette de regroupement, éditable par l'utilisateur. */
  contentTag: string
  simType: string
  baselineDps: number
  fightStyle: string | null
  targets: number | null
  duration: number | null
  /** Timestamp ms de création du rapport côté Raidbots (ou d'import). */
  createdAt: number
  importedAt: number
  upgrades: DroptimizerUpgrade[]
  /** Avertissements du parseur (format inattendu, données partielles). */
  notes: string[]
}

/** Une ligne du classement "quel contenu focus". */
export interface FocusEntry {
  contentTag: string
  /** Meilleur gain en % trouvé dans ce contenu. */
  bestGainPct: number
  /** Moyenne des 3 meilleurs gains : plus représentative qu'un pic isolé. */
  top3AvgPct: number
  upgradeCount: number
  bestItem: DroptimizerUpgrade | null
  reportIds: string[]
}

export interface CharacterFocus {
  characterId: string
  entries: FocusEntry[]
  /** Contenu recommandé (première entrée), null si aucun droptimizer. */
  recommended: FocusEntry | null
  /** Slots sans enchantement ou avec châsses vides. */
  gearIssues: string[]
  computedAt: number
}

// ---------------------------------------------------------------------------
// État applicatif persisté
// ---------------------------------------------------------------------------

export interface AppData {
  characters: Record<string, CharacterDetail>
  /** Persos exclus de la liste et de l'export. */
  hidden: string[]
  /** Persos épinglés en haut de liste. */
  pinned: string[]
  reports: Record<string, DroptimizerReport>
  /** Notes libres par personnage. */
  notes: Record<string, string>
  lastSyncAt: number | null
}

// ---------------------------------------------------------------------------
// Synchronisation
// ---------------------------------------------------------------------------

export interface SyncProgress {
  phase: 'idle' | 'account' | 'characters' | 'done' | 'error'
  current: number
  total: number
  label: string
  error?: string
}

export interface SyncResult {
  ok: boolean
  characterCount: number
  failed: { name: string; reason: string }[]
  error?: string
}

// ---------------------------------------------------------------------------
// Export addon
// ---------------------------------------------------------------------------

export interface WowInstall {
  path: string
  flavors: string[]
}

export interface ExportResult {
  ok: boolean
  /** Chemin du fichier Lua écrit. */
  filePath?: string
  characterCount?: number
  /** True si l'addon a été installé / mis à jour au passage. */
  addonInstalled?: boolean
  error?: string
}

export interface IpcResponse<T> {
  ok: boolean
  data?: T
  error?: string
}
