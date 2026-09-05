import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { DroptimizerReport, DroptimizerUpgrade } from '@shared/types'
import { groupForInventoryType, type SlotGroup } from '@shared/slots'
import { detectContent, type ContentCategory, type RaidDifficulty } from '@shared/content'
import { apiGet, localized } from './blizzard'
import { ensureIndex, lookup, resolveEncounter } from './journal'
import { resolveIcon, resolveIcons } from './media'
import { store as settingsStore } from './store'
import { t } from './i18n'

export const PARSER_VERSION = 4

const REPORT_ID_RE = /^[A-Za-z0-9_-]{4,40}$/

export function extractReportId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (REPORT_ID_RE.test(trimmed) && !trimmed.includes('/')) return trimmed

  try {
    const url = new URL(trimmed)
    if (!/raidbots\.com$/i.test(url.hostname.replace(/^www\./, ''))) return null

    const segments = url.pathname.split('/').filter(Boolean)
    const marker = segments.findIndex((s) => s === 'report' || s === 'reports')
    const candidate = marker >= 0 ? segments[marker + 1] : segments[segments.length - 1]
    return candidate && REPORT_ID_RE.test(candidate) ? candidate : null
  } catch {
    return null
  }
}

interface LibraryItem {
  id: number
  name?: string
  itemLevel?: number
  baseItemLevel?: number
  bonus_id?: string
  enchant_id?: number
  gem_id?: string
  inventoryType?: number
  instance?: { name?: string }
  encounter?: { name?: string }
}

interface RawSim {
  sim?: {
    players?: { collected_data?: { dps?: { mean?: number } } }[]
    profilesets?: { results?: { name?: string; mean?: number }[] }
    options?: { fight_style?: string; max_time?: number; desired_targets?: number }
  }
  simbot?: {
    title?: string
    type?: string
    timestamp?: number
    meta?: {
      rawFormData?: Record<string, unknown>
      itemLibrary?: LibraryItem[]
    }
  }
}

export async function fetchReport(reportId: string): Promise<RawSim> {
  const url = `https://www.raidbots.com/reports/${reportId}/data.json`
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30_000)
  })
  if (res.status === 404) throw new Error(t('err.reportNotFound', { id: reportId }))
  if (!res.ok) throw new Error(t('err.raidbots', { status: res.status }))
  return (await res.json()) as RawSim
}

export function parseRawJson(text: string): RawSim {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(t('err.badJson'))
  }
  const sim = parsed as RawSim
  if (!sim?.sim) throw new Error(t('err.noSimKey'))
  return sim
}

export async function buildReport(
  raw: RawSim,
  reportId: string,
  characterId: string,

  forced?: { category: ContentCategory; difficulty: RaidDifficulty | null }
): Promise<DroptimizerReport> {
  const notes: string[] = []

  const baselineDps =
    raw.sim?.players?.[0]?.collected_data?.dps?.mean ??
    raw.sim?.profilesets?.results?.reduce((min, r) => Math.min(min, r.mean ?? Infinity), Infinity)

  if (!baselineDps || !Number.isFinite(baselineDps)) throw new Error(t('err.noBaseline'))

  const results = raw.sim?.profilesets?.results ?? []
  if (!results.length) throw new Error(t('err.notDroptimizer'))

  const best = new Map<
    string,
    {
      itemId: number | null
      itemLevel: number | null
      bonusIds: number[]
      encounterId: number | null
      rawName: string
      dps: number
    }
  >()
  for (const result of results) {
    const rawName = result.name ?? ''
    const dps = result.mean ?? 0
    if (!rawName || !dps) continue
    const parsed = parseProfilesetName(rawName)
    const key = parsed.itemId !== null ? `id:${parsed.itemId}` : `name:${rawName}`
    const previous = best.get(key)
    if (!previous || dps > previous.dps) {
      best.set(key, {
        itemId: parsed.itemId,
        itemLevel: parsed.itemLevel,
        bonusIds: parsed.bonusIds,
        encounterId: parsed.encounterId,
        rawName,
        dps
      })
    }
  }

  const unresolved = [...best.values()].filter((e) => e.itemId === null).length
  if (unresolved) notes.push(t('note.unresolvedItems', { count: unresolved }))

  const library = readLibrary(raw)

  const needsIndex = [...best.values()].some(
    (entry) => entry.itemId === null || !library.get(entry.itemId)?.instance?.name
  )
  if (needsIndex) {
    try {
      await ensureIndex()
    } catch {
    }
  }
  const upgrades: DroptimizerUpgrade[] = []
  let unknownSources = 0

  for (const entry of best.values()) {
    const gain = entry.dps - baselineDps
    const known = entry.itemId !== null ? library.get(entry.itemId) : undefined

    const bonusIds = known?.bonus_id ? splitIds(known.bonus_id) : entry.bonusIds
    const itemLevel = known?.itemLevel ?? entry.itemLevel
    const enchantId = known?.enchant_id ?? 0
    const gemIds = splitIds(known?.gem_id)

    let instance = known?.instance?.name ?? null
    let boss = known?.encounter?.name ?? null

    if (!instance && !boss) {
      const source =
        (await resolveEncounter(entry.encounterId ?? 0)) ??
        (entry.itemId !== null ? lookup(entry.itemId) : null)
      instance = source?.instance ?? null
      boss = source?.boss ?? null
    }
    if (!instance && !boss) unknownSources++

    const meta = known?.name
      ? null
      : entry.itemId !== null
        ? await resolveItem(entry.itemId)
        : null

    upgrades.push({
      itemId: entry.itemId ?? 0,
      itemName: known?.name || meta?.name || prettifyRawName(entry.rawName),
      iconUrl: null,
      itemLevel,
      bonusIds,
      enchantId,
      gemIds,
      slotGroup: meta?.slotGroup ?? (await slotFor(entry.itemId, known)),
      instance,
      boss,
      dps: Math.round(entry.dps),
      gain: Math.round(gain),
      gainPct: (gain / baselineDps) * 100,
      wowheadUrl: wowheadItemUrl(entry.itemId ?? 0, itemLevel, bonusIds)
    })
  }

  if (unknownSources) notes.push(t('note.unknownSources', { count: unknownSources }))

  await resolveIcons(
    upgrades,
    (upgrade) => upgrade.itemId,
    (upgrade, url) => {
      upgrade.iconUrl = url
    }
  )

  upgrades.sort((a, b) => b.gainPct - a.gainPct)

  const contentLabel = raw.simbot?.title?.trim() || `Droptimizer ${reportId}`
  const detected = forced ?? detectContent(contentLabel)

  return {
    reportId,
    characterId,
    contentLabel,
    category: detected.category,
    difficulty: detected.difficulty,
    simType: raw.simbot?.type ?? 'droptimizer',
    baselineDps: Math.round(baselineDps),
    fightStyle: raw.sim?.options?.fight_style ?? null,
    targets: raw.sim?.options?.desired_targets ?? null,
    duration: raw.sim?.options?.max_time ?? null,
    createdAt: raw.simbot?.timestamp ? raw.simbot.timestamp * 1000 : Date.now(),
    importedAt: Date.now(),
    parserVersion: PARSER_VERSION,
    upgrades,
    notes
  }
}

export async function refreshReport(report: DroptimizerReport): Promise<DroptimizerReport> {
  try {
    await ensureIndex()
  } catch {
  }

  const upgrades: DroptimizerUpgrade[] = []
  for (const upgrade of report.upgrades) {
    if (!upgrade.itemId) {
      upgrades.push(upgrade)
      continue
    }
    const meta = await resolveItem(upgrade.itemId)
    const source = lookup(upgrade.itemId)
    upgrades.push({
      ...upgrade,
      itemName: upgrade.itemName || meta?.name || '',
      iconUrl: upgrade.iconUrl ?? (await resolveIcon(upgrade.itemId)),
      slotGroup: meta?.slotGroup ?? upgrade.slotGroup,
      instance: source?.instance ?? upgrade.instance,
      boss: source?.boss ?? upgrade.boss
    })
  }

  return { ...report, upgrades }
}

interface ParsedName {
  itemId: number | null
  itemLevel: number | null
  bonusIds: number[]
  encounterId: number | null
}

export function parseProfilesetName(rawName: string): ParsedName {
  const segments = rawName.split('/')
  const itemId = Number(segments[3])
  const itemLevel = Number(segments[4])

  const plausibleId = Number.isInteger(itemId) && itemId >= 10_000 && itemId <= 9_999_999
  const plausibleLevel = Number.isInteger(itemLevel) && itemLevel > 0 && itemLevel <= 2000

  if (plausibleId && plausibleLevel) {
    const bonusIds = (segments[5] ?? '')
      .split(':')
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)
    const encounter = Number(segments[1])
    return {
      itemId,
      itemLevel,
      bonusIds,
      encounterId: Number.isInteger(encounter) && encounter > 0 ? encounter : null
    }
  }

  return { itemId: guessItemId(rawName), itemLevel: null, bonusIds: [], encounterId: null }
}

function splitIds(value: string | undefined | null): number[] {
  if (!value) return []
  return value
    .split('/')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
}

/**
 * Le rapport embarque sa propre bibliotheque d'objets : niveau reel, bonus ids
 * qui portent ce niveau, enchantement, gemmes, instance et rencontre. C'est la
 * source la plus fiable, et elle evite autant d'appels a l'API Blizzard.
 */
function readLibrary(raw: RawSim): Map<number, LibraryItem> {
  const library = new Map<number, LibraryItem>()
  for (const entry of raw.simbot?.meta?.itemLibrary ?? []) {
    if (entry?.id) library.set(entry.id, entry)
  }
  return library
}

async function slotFor(
  itemId: number | null,
  known: LibraryItem | undefined
): Promise<DroptimizerUpgrade['slotGroup']> {
  if (itemId === null) return 'OTHER'
  const meta = await resolveItem(itemId)
  if (meta) return meta.slotGroup
  return known ? 'OTHER' : 'OTHER'
}

export function wowheadItemUrl(
  itemId: number,
  itemLevel: number | null,
  bonusIds: number[]
): string {
  if (!itemId) return 'https://www.wowhead.com'

  const params: string[] = []
  if (bonusIds.length) params.push(`bonus=${bonusIds.join(':')}`)
  if (itemLevel) params.push(`ilvl=${itemLevel}`)

  return `https://www.wowhead.com/item=${itemId}${params.length ? '?' + params.join('&') : ''}`
}

function guessItemId(rawName: string): number | null {
  const segments = rawName.split(/[/|:,\s]+/)
  const candidates = segments
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 10_000 && n <= 9_999_999)
  if (!candidates.length) return null
  return Math.max(...candidates)
}

function prettifyRawName(rawName: string): string {
  const words = rawName.split('/').filter((s) => s && Number.isNaN(Number(s)))
  return words.join(' ') || rawName
}

interface ItemMeta {
  name: string
  slotGroup: SlotGroup
}

let cache: Record<string, ItemMeta | null> | null = null
let cachePath = ''
let cacheDirty = false

function loadCache(): Record<string, ItemMeta | null> {
  if (cache) return cache

  cachePath = path.join(app.getPath('userData'), 'item-cache-v2.json')
  try {
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as Record<string, ItemMeta | null>

    cache = Object.fromEntries(Object.entries(raw).filter(([key]) => key.includes(':')))
    if (Object.keys(cache).length !== Object.keys(raw).length) cacheDirty = true
  } catch {
    cache = {}
  }
  return cache!
}

export function flushItemCache(): void {
  if (!cacheDirty || !cache || !cachePath) return
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
    cacheDirty = false
  } catch {
  }
}

interface ItemResponse {
  name?: unknown
  inventory_type?: { type: string; name?: unknown }
}

function cacheKey(itemId: number): string {
  return `${settingsStore.getSettings().locale}:${itemId}`
}

async function resolveItem(itemId: number): Promise<ItemMeta | null> {
  const cacheMap = loadCache()
  const key = cacheKey(itemId)
  if (key in cacheMap) return cacheMap[key]

  try {
    const item = await apiGet<ItemResponse>(`/data/wow/item/${itemId}`, {
      namespace: 'static',
      optional: true
    })
    const meta: ItemMeta | null = item
      ? {
          name: localized(item.name),
          slotGroup: groupForInventoryType(item.inventory_type?.type)
        }
      : null
    cacheMap[key] = meta
    cacheDirty = true
    return meta
  } catch {
    return null
  }
}
