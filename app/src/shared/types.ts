import type { Lang } from './i18n'
import type { SlotGroup } from './slots'
import type { ContentCategory, RaidDifficulty } from './content'

export const EXPORT_SCHEMA_VERSION = 3

export type Region = 'eu' | 'us' | 'kr' | 'tw'

export const REGIONS: Region[] = ['eu', 'us', 'kr', 'tw']

export const LOCALES: Record<Region, string[]> = {
  eu: ['fr_FR', 'en_GB', 'de_DE', 'es_ES', 'it_IT', 'pt_PT', 'ru_RU'],
  us: ['en_US', 'es_MX', 'pt_BR'],
  kr: ['ko_KR'],
  tw: ['zh_TW']
}

export interface AppSettings {
  clientId: string

  clientSecret: string
  region: Region
  locale: string

  language: Lang

  minLevel: number

  wowPath: string | null

  wowFlavor: string

  oauthPort: number

  autoExport: boolean
}

export interface AuthStatus {
  connected: boolean
  battletag: string | null

  expiresAt: number | null
}

export interface CharacterRef {
  id: string
  name: string
  realm: string
  realmSlug: string
  region: Region
  level: number
  className: string

  classId: number
  raceName: string
  faction: 'ALLIANCE' | 'HORDE' | 'NEUTRAL'

  accountLabel: string
}

export interface GearItem {
  slot: string
  itemId: number
  name: string
  itemLevel: number

  quality: string
  enchantment: string | null
  sockets: number
  emptySockets: number

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

  tierPieces: number
  avatarUrl: string | null

  warnings: string[]
}

export interface DroptimizerUpgrade {
  itemId: number
  itemName: string

  slotGroup: SlotGroup

  instance: string | null

  boss: string | null
  dps: number

  gain: number

  gainPct: number
  wowheadUrl: string
}

export interface DroptimizerReport {
  reportId: string
  characterId: string

  contentLabel: string

  category: ContentCategory

  difficulty: RaidDifficulty | null
  simType: string
  baselineDps: number
  fightStyle: string | null
  targets: number | null
  duration: number | null

  createdAt: number
  importedAt: number
  upgrades: DroptimizerUpgrade[]

  notes: string[]
}

export interface FocusEntry {
  category: ContentCategory
  difficulty: RaidDifficulty | null

  labelKey: string

  bestGainPct: number

  bestGain: number

  top3AvgPct: number

  top3AvgGain: number
  upgradeCount: number
  bestItem: DroptimizerUpgrade | null
  reportIds: string[]
}

export interface SlotUpgrades {
  slotGroup: SlotGroup

  upgrades: (DroptimizerUpgrade & { labelKey: string })[]

  candidateCount: number
}

export type GearIssueType = 'enchant' | 'socket' | 'tier'

export interface GearIssue {
  type: GearIssueType

  slot?: string
  count?: number
}

export interface WeakSlot {
  slot: string
  itemLevel: number
}

export interface CharacterFocus {
  characterId: string
  entries: FocusEntry[]

  recommended: FocusEntry | null
  gearIssues: GearIssue[]

  bySlot: SlotUpgrades[]
  computedAt: number
}

export interface JournalStatus {
  itemCount: number
  builtAt: number | null
  locale: string | null
  building: boolean
}

export interface AppData {
  characters: Record<string, CharacterDetail>

  hidden: string[]

  pinned: string[]
  reports: Record<string, DroptimizerReport>

  notes: Record<string, string>
  lastSyncAt: number | null
}

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

export interface WowInstall {
  path: string
  flavors: string[]
}

export interface ExportResult {
  ok: boolean

  filePath?: string
  characterCount?: number

  addonInstalled?: boolean
  error?: string
}

export interface IpcResponse<T> {
  ok: boolean
  data?: T
  error?: string
}
