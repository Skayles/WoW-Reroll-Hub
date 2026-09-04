import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { DroptimizerReport, DroptimizerUpgrade } from '@shared/types'
import { apiGet, localized } from './blizzard'
import { SLOT_LABELS } from '@shared/constants'

/**
 * Import d'un rapport Droptimizer Raidbots.
 *
 * Raidbots ne documente pas publiquement le format de data.json et le nom des
 * profilesets a déjà changé plusieurs fois. Le parseur est donc volontairement
 * tolérant : il extrait les identifiants d'objet par heuristique, puis les
 * résout via l'API Blizzard (qui, elle, est stable) pour obtenir nom et slot.
 * Si un identifiant ne résout pas, l'objet est conservé avec son nom brut
 * plutôt que jeté.
 */

const REPORT_ID_RE = /^[A-Za-z0-9_-]{4,40}$/

/** Accepte une URL de rapport complète ou un identifiant nu. */
export function extractReportId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (REPORT_ID_RE.test(trimmed) && !trimmed.includes('/')) return trimmed

  try {
    const url = new URL(trimmed)
    if (!/raidbots\.com$/i.test(url.hostname.replace(/^www\./, ''))) return null
    // .../simbot/report/<id>, .../reports/<id>/data.json
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
  if (res.status === 404) {
    throw new Error(
      `Rapport ${reportId} introuvable. Les rapports Raidbots expirent (30 jours pour un compte gratuit) — relance le Droptimizer.`
    )
  }
  if (!res.ok) throw new Error(`Raidbots a répondu ${res.status}.`)
  return (await res.json()) as RawSim
}

export function parseRawJson(text: string): RawSim {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Le contenu collé n'est pas du JSON valide (attendu : le data.json du rapport).")
  }
  const sim = parsed as RawSim
  if (!sim?.sim) throw new Error("JSON inattendu : la clé \"sim\" est absente.")
  return sim
}

/** Convertit un rapport brut en modèle applicatif. */
export async function buildReport(
  raw: RawSim,
  reportId: string,
  characterId: string
): Promise<DroptimizerReport> {
  const notes: string[] = []

  const baselineDps =
    raw.sim?.players?.[0]?.collected_data?.dps?.mean ??
    raw.sim?.profilesets?.results?.reduce((min, r) => Math.min(min, r.mean ?? Infinity), Infinity)

  if (!baselineDps || !Number.isFinite(baselineDps)) {
    throw new Error("Impossible de déterminer le DPS de référence dans ce rapport.")
  }

  const results = raw.sim?.profilesets?.results ?? []
  if (!results.length) {
    throw new Error(
      "Ce rapport ne contient aucun profileset : ce n'est probablement pas un Droptimizer (Top Gear et Quick Sim ne sont pas supportés)."
    )
  }

  // Un même objet apparaît à plusieurs ilvl/difficultés : on ne garde que sa
  // meilleure occurrence, c'est elle qui décide s'il vaut le coup de farm.
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
  if (unresolved) {
    notes.push(`${unresolved} objet(s) sans identifiant reconnu, affichés avec leur nom brut.`)
  }

  const upgrades: DroptimizerUpgrade[] = []
  for (const entry of best.values()) {
    const gain = entry.dps - baselineDps
    const meta = entry.itemId !== null ? await resolveItem(entry.itemId) : null
    upgrades.push({
      itemId: entry.itemId ?? 0,
      itemName: meta?.name || prettifyRawName(entry.rawName),
      slot: meta?.slot || sourceFromRawName(entry.rawName).slot,
      source: sourceFromRawName(entry.rawName).source,
      dps: Math.round(entry.dps),
      gain: Math.round(gain),
      gainPct: (gain / baselineDps) * 100,
      wowheadUrl: entry.itemId
        ? `https://www.wowhead.com/fr/item=${entry.itemId}`
        : 'https://www.wowhead.com/fr'
    })
  }

  upgrades.sort((a, b) => b.gainPct - a.gainPct)

  const contentLabel = raw.simbot?.title?.trim() || `Droptimizer ${reportId}`

  return {
    reportId,
    characterId,
    contentLabel,
    contentTag: contentLabel,
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

// ---------------------------------------------------------------------------
// Heuristiques sur le nom de profileset
// ---------------------------------------------------------------------------

/**
 * Les identifiants d'objet WoW actuels tiennent sur 5 à 7 chiffres. Les autres
 * segments numériques d'un nom de profileset (ilvl ~600-750, bonus IDs à 3-4
 * chiffres, index d'encounter) tombent en dehors, sauf collision rare : on
 * privilégie donc le segment le plus grand, qui est presque toujours l'item ID.
 */
function guessItemId(rawName: string): number | null {
  const segments = rawName.split(/[/|:,\s]+/)
  const candidates = segments
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 10_000 && n <= 9_999_999)
  if (!candidates.length) return null
  return Math.max(...candidates)
}

/** Récupère ce qui ressemble à une source/difficulté et un slot dans le nom brut. */
function sourceFromRawName(rawName: string): { source: string; slot: string } {
  const segments = rawName.split('/').filter(Boolean)
  const words = segments.filter((s) => Number.isNaN(Number(s)))

  const slotWord = words.find((w) => /^(head|neck|shoulder|back|chest|wrist|hands|waist|legs|feet|finger|trinket|main_hand|off_hand|weapon)/i.test(w))
  const source = words.filter((w) => w !== slotWord).join(' ') || 'Inconnue'

  return { source, slot: slotWord ? slotWord.replace(/_/g, ' ') : '' }
}

function prettifyRawName(rawName: string): string {
  const words = rawName.split('/').filter((s) => s && Number.isNaN(Number(s)))
  return words.join(' ') || rawName
}

// ---------------------------------------------------------------------------
// Résolution des objets via l'API Blizzard (avec cache disque)
// ---------------------------------------------------------------------------

interface ItemMeta {
  name: string
  slot: string
}

let cache: Record<string, ItemMeta | null> | null = null
let cachePath = ''
let cacheDirty = false

function loadCache(): Record<string, ItemMeta | null> {
  if (cache) return cache
  cachePath = path.join(app.getPath('userData'), 'item-cache.json')
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
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
    /* le cache est un confort, pas une donnée critique */
  }
}

interface ItemResponse {
  name?: unknown
  inventory_type?: { type: string; name?: unknown }
}

async function resolveItem(itemId: number): Promise<ItemMeta | null> {
  const store = loadCache()
  const key = String(itemId)
  if (key in store) return store[key]

  try {
    const item = await apiGet<ItemResponse>(`/data/wow/item/${itemId}`, {
      namespace: 'static',
      optional: true
    })
    const meta: ItemMeta | null = item
      ? {
          name: localized(item.name),
          slot:
            SLOT_LABELS[item.inventory_type?.type ?? ''] ??
            localized(item.inventory_type?.name) ??
            ''
        }
      : null
    store[key] = meta
    cacheDirty = true
    return meta
  } catch {
    // Un échec de résolution ne doit pas être mis en cache : l'objet pourra
    // être retrouvé au prochain import.
    return null
  }
}
