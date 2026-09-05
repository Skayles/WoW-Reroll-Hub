import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { DroptimizerReport, DroptimizerUpgrade } from '@shared/types'
import { groupForInventoryType, type SlotGroup } from '@shared/slots'
import { detectContent, type ContentCategory, type RaidDifficulty } from '@shared/content'
import { apiGet, localized } from './blizzard'
import { ensureIndex, lookup } from './journal'
import { resolveIcon, resolveIcons } from './media'
import { store as settingsStore } from './store'
import { t } from './i18n'

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
    meta?: { rawFormData?: Record<string, unknown> }
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

  const best = new Map<string, { itemId: number | null; rawName: string; dps: number }>()
  for (const result of results) {
    const rawName = result.name ?? ''
    const dps = result.mean ?? 0
    if (!rawName || !dps) continue
    const itemId = guessItemId(rawName)
    const key = itemId !== null ? `id:${itemId}` : `name:${rawName}`
    const previous = best.get(key)
    if (!previous || dps > previous.dps) best.set(key, { itemId, rawName, dps })
  }

  const unresolved = [...best.values()].filter((e) => e.itemId === null).length
  if (unresolved) notes.push(t('note.unresolvedItems', { count: unresolved }))

  try {
    await ensureIndex()
  } catch {
  }

  const upgrades: DroptimizerUpgrade[] = []
  let unknownSources = 0

  for (const entry of best.values()) {
    const gain = entry.dps - baselineDps
    const meta = entry.itemId !== null ? await resolveItem(entry.itemId) : null
    const source = entry.itemId !== null ? lookup(entry.itemId) : null
    if (!source) unknownSources++

    upgrades.push({
      itemId: entry.itemId ?? 0,
      itemName: meta?.name || prettifyRawName(entry.rawName),
      iconUrl: null,
      slotGroup: meta?.slotGroup ?? 'OTHER',
      instance: source?.instance ?? null,
      boss: source?.boss ?? null,
      dps: Math.round(entry.dps),
      gain: Math.round(gain),
      gainPct: (gain / baselineDps) * 100,
      wowheadUrl: entry.itemId
        ? `https://www.wowhead.com/item=${entry.itemId}`
        : 'https://www.wowhead.com'
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
      itemName: meta?.name || upgrade.itemName,
      iconUrl: upgrade.iconUrl ?? (await resolveIcon(upgrade.itemId)),
      slotGroup: meta?.slotGroup ?? upgrade.slotGroup,
      instance: source?.instance ?? upgrade.instance,
      boss: source?.boss ?? upgrade.boss
    })
  }

  return { ...report, upgrades }
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
