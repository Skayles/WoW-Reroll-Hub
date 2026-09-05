import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { apiGet } from './blizzard'
import { store } from './store'

interface MediaResponse {
  assets?: { key: string; value: string }[]
}

let cache: Record<string, string | null> | null = null
let cachePath = ''
let dirty = false

function load(): Record<string, string | null> {
  if (cache) return cache
  cachePath = path.join(app.getPath('userData'), 'icon-cache.json')
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
  } catch {
    cache = {}
  }
  return cache!
}

export function flushIconCache(): void {
  if (!dirty || !cache || !cachePath) return
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8')
    dirty = false
  } catch {
    /* noop */
  }
}

export async function resolveIcon(itemId: number): Promise<string | null> {
  if (!itemId) return null

  const cacheMap = load()
  const key = String(itemId)
  if (key in cacheMap) return cacheMap[key]

  try {
    const media = await apiGet<MediaResponse>(`/data/wow/media/item/${itemId}`, {
      namespace: 'static',
      optional: true
    })
    const url = media?.assets?.find((asset) => asset.key === 'icon')?.value ?? null
    cacheMap[key] = url
    dirty = true
    return url
  } catch {
    return null
  }
}

export async function backfillIcons(): Promise<number> {
  const data = store.getData()
  const missing = new Set<number>()

  for (const character of Object.values(data.characters)) {
    for (const item of character.gear) {
      if (!item.iconUrl && item.itemId) missing.add(item.itemId)
    }
  }
  for (const report of Object.values(data.reports)) {
    for (const upgrade of report.upgrades) {
      if (!upgrade.iconUrl && upgrade.itemId) missing.add(upgrade.itemId)
    }
  }

  if (!missing.size) return 0

  const ids = [...missing]
  let applied = 0
  const CHUNK = 24

  for (let i = 0; i < ids.length; i += CHUNK) {
    const resolved = new Map<number, string | null>()
    await Promise.all(
      ids.slice(i, i + CHUNK).map(async (itemId) => {
        resolved.set(itemId, await resolveIcon(itemId))
      })
    )

    store.mutate((current) => {
      for (const character of Object.values(current.characters)) {
        for (const item of character.gear) {
          const url = resolved.get(item.itemId)
          if (!item.iconUrl && url) {
            item.iconUrl = url
            applied++
          }
        }
      }
      for (const report of Object.values(current.reports)) {
        for (const upgrade of report.upgrades) {
          const url = resolved.get(upgrade.itemId)
          if (!upgrade.iconUrl && url) {
            upgrade.iconUrl = url
            applied++
          }
        }
      }
    })
    flushIconCache()
  }

  return applied
}

export async function resolveIcons<T>(
  items: T[],
  itemIdOf: (item: T) => number,
  apply: (item: T, url: string | null) => void
): Promise<void> {
  await Promise.all(
    items.map(async (item) => {
      apply(item, await resolveIcon(itemIdOf(item)))
    })
  )
}
