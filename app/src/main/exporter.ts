import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { CharacterDetail, ExportResult } from '@shared/types'
import { EXPORT_SCHEMA_VERSION } from '@shared/types'
import { ADDON_NAME } from '@shared/constants'
import { computeFocus, findWeakSlots } from '@shared/focus'
import { toLua } from './lua'
import { store } from './store'
import { t } from './i18n'
import { addonsDir, isWowRoot } from './wowPath'

function addonSourceDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'addon', ADDON_NAME)
    : path.resolve(app.getAppPath(), '..', 'addon', ADDON_NAME)
}

function buildPayload(): { lua: string; count: number } {
  const data = store.getData()
  const settings = store.getSettings()
  const reports = Object.values(data.reports)
  const hidden = new Set(data.hidden)

  const characters = Object.values(data.characters)
    .filter((c) => !hidden.has(c.id))
    .sort((a, b) => b.equippedItemLevel - a.equippedItemLevel)
    .map((character) => serializeCharacter(character, reports, data.notes[character.id]))

  const payload = {
    schema: EXPORT_SCHEMA_VERSION,
    generatedAt: Math.floor(Date.now() / 1000),
    generatedAtText: new Date().toLocaleString(settings.language === 'en' ? 'en-GB' : 'fr-FR'),
    region: settings.region,

    lang: settings.language,
    characters
  }

  const lua = [
    '-- Généré par WoW Reroll Hub. Ne pas éditer à la main :',
    '-- ce fichier est écrasé à chaque export depuis l\'application.',
    `-- Export du ${payload.generatedAtText}`,
    '',
    `${ADDON_NAME}Data = ${toLua(payload, 1)}`,
    ''
  ].join('\n')

  return { lua, count: characters.length }
}

function serializeCharacter(
  character: CharacterDetail,
  reports: ReturnType<typeof store.getData>['reports'][string][],
  note: string | undefined
): Record<string, unknown> {
  const focus = computeFocus(character, reports)

  return {
    id: character.id,
    name: character.name,
    realm: character.realm,
    region: character.region,
    level: character.level,
    className: character.className,
    classId: character.classId,
    spec: character.specName ?? '',
    role: character.role ?? '',
    faction: character.faction,
    guild: character.guild ?? '',
    ilvl: character.equippedItemLevel,
    ilvlMax: character.averageItemLevel,
    mplus: character.mythicPlus?.rating ?? 0,
    tierPieces: character.tierPieces,
    syncedAt: Math.floor(character.syncedAt / 1000),
    note: note ?? '',
    focus: focus.recommended
      ? {
          category: focus.recommended.category,
          difficulty: focus.recommended.difficulty ?? '',
          bestGainPct: round2(focus.recommended.bestGainPct),
          bestGain: Math.round(focus.recommended.bestGain),
          top3AvgPct: round2(focus.recommended.top3AvgPct),
          top3AvgGain: Math.round(focus.recommended.top3AvgGain),
          upgradeCount: focus.recommended.upgradeCount
        }
      : null,
    contents: focus.entries.map((entry) => ({
      category: entry.category,
      difficulty: entry.difficulty ?? '',
      bestGainPct: round2(entry.bestGainPct),
      bestGain: Math.round(entry.bestGain),
      top3AvgPct: round2(entry.top3AvgPct),
      top3AvgGain: Math.round(entry.top3AvgGain),
      upgradeCount: entry.upgradeCount
    })),

    bySlot: focus.bySlot
      .filter((slot) => slot.upgrades.length > 0)
      .map((slot) => ({
        slot: slot.slotGroup,
        candidates: slot.candidateCount,
        items: slot.upgrades.map((upgrade) => ({
          itemId: upgrade.itemId,
          name: upgrade.itemName,
          gainPct: round2(upgrade.gainPct),
          gain: Math.round(upgrade.gain),
          category: upgrade.labelKey.startsWith('content.RAID.') ? 'RAID' : upgrade.labelKey.replace('content.', ''),
          difficulty: upgrade.labelKey.startsWith('content.RAID.')
            ? upgrade.labelKey.replace('content.RAID.', '')
            : '',
          instance: upgrade.instance ?? '',
          boss: upgrade.boss ?? ''
        }))
      })),

    issues: focus.gearIssues.map((issue) => ({
      type: issue.type,
      slot: issue.slot ?? '',
      count: issue.count ?? 0
    })),
    weakSlots: findWeakSlots(character).map((weak) => ({
      slot: weak.slot,
      ilvl: weak.itemLevel
    })),
    raids: character.raids.map((r) => ({
      raid: r.raid,
      difficulty: r.difficulty,
      killed: r.killed,
      total: r.total
    }))
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2))
}

function installAddonFiles(target: string): boolean {
  const source = addonSourceDir()
  if (!fs.existsSync(source)) return false

  fs.mkdirSync(path.join(target, 'Data'), { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) continue
    fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name))
  }
  return true
}

export function exportToAddon(): ExportResult {
  const settings = store.getSettings()
  if (!settings.wowPath) {
    return { ok: false, error: t('err.noWowPath') }
  }
  if (!isWowRoot(settings.wowPath)) {
    return {
      ok: false,
      error: t('err.notWowRoot', { path: settings.wowPath })
    }
  }

  const dir = addonsDir(settings.wowPath, settings.wowFlavor)
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      error: t('err.addonsMissing', { path: dir })
    }
  }

  try {
    const target = path.join(dir, ADDON_NAME)
    const addonInstalled = installAddonFiles(target)
    const { lua, count } = buildPayload()

    const filePath = path.join(target, 'Data', 'Export.lua')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })

    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, lua, 'utf8')
    fs.renameSync(tmp, filePath)

    return { ok: true, filePath, characterCount: count, addonInstalled }
  } catch (err) {
    const message = (err as NodeJS.ErrnoException).code === 'EPERM'
      ? t('err.addonsDenied')
      : (err as Error).message
    return { ok: false, error: message }
  }
}

export function exportToFile(filePath: string): ExportResult {
  try {
    const { lua, count } = buildPayload()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, lua, 'utf8')
    return { ok: true, filePath, characterCount: count }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export function previewExport(): string {
  return buildPayload().lua
}
