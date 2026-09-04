import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import type { WowInstall } from '@shared/types'
import { WOW_FLAVORS } from '@shared/constants'

const exec = promisify(execFile)

const KNOWN_FLAVORS = WOW_FLAVORS.map((f) => f.id)

export function flavorsIn(root: string): string[] {
  try {
    return KNOWN_FLAVORS.filter((flavor) => fs.existsSync(path.join(root, flavor)))
  } catch {
    return []
  }
}

export function isWowRoot(root: string): boolean {
  return flavorsIn(root).length > 0
}

export function normalizeWowRoot(input: string): string | null {
  const candidate = path.normalize(input.trim().replace(/^"|"$/g, ''))
  if (!candidate) return null
  if (isWowRoot(candidate)) return candidate

  const parent = path.dirname(candidate)
  if (KNOWN_FLAVORS.includes(path.basename(candidate)) && isWowRoot(parent)) return parent

  const upThree = path.resolve(candidate, '..', '..', '..')
  if (isWowRoot(upThree)) return upThree

  return null
}

async function fromRegistry(): Promise<string[]> {
  const keys = [
    'HKLM\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\World of Warcraft',
    'HKLM\\SOFTWARE\\Blizzard Entertainment\\World of Warcraft',
    'HKCU\\SOFTWARE\\Blizzard Entertainment\\World of Warcraft'
  ]
  const found: string[] = []

  for (const key of keys) {
    try {
      const { stdout } = await exec('reg', ['query', key, '/v', 'InstallPath'], {
        windowsHide: true
      })
      const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/i)
      if (match) found.push(match[1].trim())
    } catch {
    }
  }
  return found
}

function commonPaths(): string[] {
  const suffixes = [
    'Program Files (x86)\\World of Warcraft',
    'Program Files\\World of Warcraft',
    'World of Warcraft',
    'Games\\World of Warcraft',
    'Battle.net\\World of Warcraft'
  ]
  const drives = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const paths: string[] = []
  for (const drive of drives) {
    const root = `${drive}:\\`
    if (!fs.existsSync(root)) continue
    for (const suffix of suffixes) paths.push(path.join(root, suffix))
  }
  return paths
}

export async function detectInstalls(): Promise<WowInstall[]> {
  const candidates = new Set<string>()

  for (const registryPath of await fromRegistry()) {
    const normalized = normalizeWowRoot(registryPath)
    if (normalized) candidates.add(normalized)
  }
  for (const candidate of commonPaths()) {
    if (isWowRoot(candidate)) candidates.add(path.normalize(candidate))
  }

  return [...candidates].map((root) => ({ path: root, flavors: flavorsIn(root) }))
}

export function addonsDir(root: string, flavor: string): string {
  return path.join(root, flavor, 'Interface', 'AddOns')
}
