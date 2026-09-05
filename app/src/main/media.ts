import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { apiGet } from './blizzard'

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

  const store = load()
  const key = String(itemId)
  if (key in store) return store[key]

  try {
    const media = await apiGet<MediaResponse>(`/data/wow/media/item/${itemId}`, {
      namespace: 'static',
      optional: true
    })
    const url = media?.assets?.find((asset) => asset.key === 'icon')?.value ?? null
    store[key] = url
    dirty = true
    return url
  } catch {
    return null
  }
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
