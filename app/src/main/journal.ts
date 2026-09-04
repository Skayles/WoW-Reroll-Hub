import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { JournalStatus } from '@shared/types'
import { apiGet, localized } from './blizzard'
import { store } from './store'

const EXPANSIONS_TO_INDEX = 2

const MAX_AGE_MS = 30 * 24 * 3600 * 1000

export interface LootSource {
  instance: string

  boss: string
}

interface JournalCache {
  builtAt: number
  locale: string
  region: string
  items: Record<string, LootSource>
}

let cache: JournalCache | null = null
let building: Promise<JournalCache> | null = null

function cachePath(): string {
  return path.join(app.getPath('userData'), 'journal-cache.json')
}

function load(): JournalCache | null {
  if (cache) return cache
  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath(), 'utf8')) as JournalCache
    if (parsed?.items) cache = parsed
  } catch {
    cache = null
  }
  return cache
}

export function journalStatus(): JournalStatus {
  const current = load()
  return {
    itemCount: current ? Object.keys(current.items).length : 0,
    builtAt: current?.builtAt ?? null,
    locale: current?.locale ?? null,
    building: building !== null
  }
}

function isStale(current: JournalCache | null): boolean {
  if (!current) return true
  const settings = store.getSettings()
  if (current.locale !== settings.locale || current.region !== settings.region) return true
  return Date.now() - current.builtAt > MAX_AGE_MS
}

export async function ensureIndex(force = false): Promise<JournalCache> {
  const current = load()
  if (!force && current && !isStale(current)) return current
  if (building) return building

  building = build()
    .then((built) => {
      cache = built
      try {
        fs.writeFileSync(cachePath(), JSON.stringify(built), 'utf8')
      } catch {
      }
      return built
    })
    .finally(() => {
      building = null
    })

  return building
}

export function lookup(itemId: number): LootSource | null {
  const current = load()
  return current?.items[String(itemId)] ?? null
}

interface ExpansionIndexResponse {
  tiers?: { id: number; name?: unknown }[]
}

interface ExpansionResponse {
  dungeons?: { id: number; name?: unknown }[]
  raids?: { id: number; name?: unknown }[]
}

interface InstanceResponse {
  name?: unknown
  encounters?: { id: number; name?: unknown }[]
}

interface EncounterResponse {
  name?: unknown
  items?: { item?: { id: number; name?: unknown } }[]
}

async function build(): Promise<JournalCache> {
  const settings = store.getSettings()
  const items: Record<string, LootSource> = {}

  const index = await apiGet<ExpansionIndexResponse>('/data/wow/journal-expansion/index', {
    namespace: 'static'
  })

  const tiers = (index?.tiers ?? [])
    .slice()
    .sort((a, b) => b.id - a.id)
    .slice(0, EXPANSIONS_TO_INDEX)

  const instanceIds: number[] = []
  for (const tier of tiers) {
    const expansion = await apiGet<ExpansionResponse>(
      `/data/wow/journal-expansion/${tier.id}`,
      { namespace: 'static', optional: true }
    )
    for (const instance of [...(expansion?.raids ?? []), ...(expansion?.dungeons ?? [])]) {
      instanceIds.push(instance.id)
    }
  }

  await Promise.all(
    instanceIds.map(async (instanceId) => {
      const instance = await apiGet<InstanceResponse>(
        `/data/wow/journal-instance/${instanceId}`,
        { namespace: 'static', optional: true }
      )
      if (!instance) return

      const instanceName = localized(instance.name)

      await Promise.all(
        (instance.encounters ?? []).map(async (ref) => {
          const encounter = await apiGet<EncounterResponse>(
            `/data/wow/journal-encounter/${ref.id}`,
            { namespace: 'static', optional: true }
          )
          if (!encounter) return

          const bossName = localized(encounter.name) || localized(ref.name)
          for (const entry of encounter.items ?? []) {
            const id = entry.item?.id
            if (!id) continue

            if (!items[String(id)]) {
              items[String(id)] = { instance: instanceName, boss: bossName }
            }
          }
        })
      )
    })
  )

  return {
    builtAt: Date.now(),
    locale: settings.locale,
    region: settings.region,
    items
  }
}
