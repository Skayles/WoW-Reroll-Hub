import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { CharacterDetail, ExportResult } from '@shared/types'
import { EXPORT_SCHEMA_VERSION } from '@shared/types'
import { ADDON_NAME } from '@shared/constants'
import { computeFocus, findWeakSlots } from '@shared/focus'
import { toLua } from './lua'
import { store } from './store'
import { addonsDir, isWowRoot } from './wowPath'

/** Nombre d'améliorations retenues par perso : au-delà, le fichier gonfle pour rien. */
const MAX_UPGRADES_PER_CHARACTER = 8

/** Dossier source de l'addon, différent selon dev / application packagée. */
function addonSourceDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'addon', ADDON_NAME)
    : path.resolve(app.getAppPath(), '..', 'addon', ADDON_NAME)
}

// ---------------------------------------------------------------------------
// Construction du payload
// ---------------------------------------------------------------------------

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
    generatedAtText: new Date().toLocaleString('fr-FR'),
    region: settings.region,
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

  // Meilleures améliorations tous contenus confondus, dédoublonnées par objet :
  // un même item simulé dans deux rapports ne doit apparaître qu'une fois, avec
  // le contenu où il rapporte le plus.
  const byItem = new Map<number, { gainPct: number; itemName: string; slot: string; contentTag: string }>()
  for (const report of reports) {
    if (report.characterId !== character.id) continue
    const tag = report.contentTag || report.contentLabel || 'Non classé'
    for (const upgrade of report.upgrades) {
      if (upgrade.gainPct <= 0) continue
      const previous = byItem.get(upgrade.itemId)
      if (!previous || upgrade.gainPct > previous.gainPct) {
        byItem.set(upgrade.itemId, {
          gainPct: upgrade.gainPct,
          itemName: upgrade.itemName,
          slot: upgrade.slot,
          contentTag: tag
        })
      }
    }
  }

  const upgrades = [...byItem.entries()]
    .map(([itemId, entry]) => ({ itemId, ...entry }))
    .sort((a, b) => b.gainPct - a.gainPct)
    .slice(0, MAX_UPGRADES_PER_CHARACTER)

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
          content: focus.recommended.contentTag,
          bestGainPct: Number(focus.recommended.bestGainPct.toFixed(2)),
          top3AvgPct: Number(focus.recommended.top3AvgPct.toFixed(2)),
          upgradeCount: focus.recommended.upgradeCount
        }
      : null,
    contents: focus.entries.map((entry) => ({
      tag: entry.contentTag,
      bestGainPct: Number(entry.bestGainPct.toFixed(2)),
      top3AvgPct: Number(entry.top3AvgPct.toFixed(2)),
      upgradeCount: entry.upgradeCount
    })),
    upgrades: upgrades.map((u) => ({
      itemId: u.itemId,
      name: u.itemName,
      slot: u.slot,
      content: u.contentTag,
      gainPct: Number(u.gainPct.toFixed(2))
    })),

    issues: focus.gearIssues,
    weakSlots: findWeakSlots(character),
    raids: character.raids.map((r) => ({
      raid: r.raid,
      difficulty: r.difficulty,
      killed: r.killed,
      total: r.total
    }))
  }
}

// ---------------------------------------------------------------------------
// Écriture sur disque
// ---------------------------------------------------------------------------

/** Copie les fichiers de l'addon vers le dossier AddOns (hors données). */
function installAddonFiles(target: string): boolean {
  const source = addonSourceDir()
  if (!fs.existsSync(source)) return false

  fs.mkdirSync(path.join(target, 'Data'), { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    // Le dossier Data est généré, jamais copié depuis les sources.
    if (entry.isDirectory()) continue
    fs.copyFileSync(path.join(source, entry.name), path.join(target, entry.name))
  }
  return true
}

export function exportToAddon(): ExportResult {
  const settings = store.getSettings()
  if (!settings.wowPath) {
    return { ok: false, error: "Aucun dossier WoW configuré. Va dans Réglages > Dossier WoW." }
  }
  if (!isWowRoot(settings.wowPath)) {
    return {
      ok: false,
      error: `"${settings.wowPath}" ne ressemble pas à une installation WoW (aucun dossier _retail_ / _classic_ trouvé).`
    }
  }

  const dir = addonsDir(settings.wowPath, settings.wowFlavor)
  if (!fs.existsSync(dir)) {
    return {
      ok: false,
      error: `Dossier introuvable : ${dir}. Lance WoW au moins une fois avec cette saveur.`
    }
  }

  try {
    const target = path.join(dir, ADDON_NAME)
    const addonInstalled = installAddonFiles(target)
    const { lua, count } = buildPayload()

    const filePath = path.join(target, 'Data', 'Export.lua')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    // Écriture atomique : WoW peut lire le dossier pendant qu'on écrit.
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, lua, 'utf8')
    fs.renameSync(tmp, filePath)

    return { ok: true, filePath, characterCount: count, addonInstalled }
  } catch (err) {
    const message = (err as NodeJS.ErrnoException).code === 'EPERM'
      ? "Accès refusé au dossier AddOns. Ferme WoW ou lance l'application en administrateur."
      : (err as Error).message
    return { ok: false, error: message }
  }
}

/** Écrit le même fichier ailleurs (dépannage, machine distante). */
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

/** Aperçu du fichier généré, affiché dans l'interface avant export. */
export function previewExport(): string {
  return buildPayload().lua
}
