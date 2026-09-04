import type {
  CharacterDetail,
  CharacterFocus,
  DroptimizerReport,
  FocusEntry
} from './types'

/**
 * Classe les contenus simulés d'un personnage par potentiel de gain.
 *
 * On ne se base pas uniquement sur le meilleur item : un seul objet à +8 % dans
 * un contenu où rien d'autre ne drop est moins intéressant qu'un contenu où
 * cinq objets rapportent +4 %. D'où le tri sur la moyenne des trois meilleurs
 * gains, le pic servant seulement de départage.
 */
export function computeFocus(
  character: CharacterDetail,
  reports: DroptimizerReport[]
): CharacterFocus {
  const byTag = new Map<string, DroptimizerReport[]>()
  for (const report of reports) {
    if (report.characterId !== character.id) continue
    const tag = report.contentTag || report.contentLabel || 'Non classé'
    const list = byTag.get(tag)
    if (list) list.push(report)
    else byTag.set(tag, [report])
  }

  const entries: FocusEntry[] = []
  for (const [contentTag, group] of byTag) {
    const upgrades = group
      .flatMap((r) => r.upgrades)
      .filter((u) => u.gainPct > 0)
      .sort((a, b) => b.gainPct - a.gainPct)

    const top3 = upgrades.slice(0, 3)
    const top3AvgPct = top3.length
      ? top3.reduce((sum, u) => sum + u.gainPct, 0) / top3.length
      : 0

    entries.push({
      contentTag,
      bestGainPct: upgrades[0]?.gainPct ?? 0,
      top3AvgPct,
      upgradeCount: upgrades.length,
      bestItem: upgrades[0] ?? null,
      reportIds: group.map((r) => r.reportId)
    })
  }

  entries.sort((a, b) => b.top3AvgPct - a.top3AvgPct || b.bestGainPct - a.bestGainPct)

  return {
    characterId: character.id,
    entries,
    recommended: entries[0] ?? null,
    gearIssues: findGearIssues(character),
    computedAt: Date.now()
  }
}

/**
 * Problèmes d'optimisation détectables sans simulation : enchantements manquants
 * et châsses vides. Ce sont des gains gratuits, à traiter avant tout farm.
 */
export function findGearIssues(character: CharacterDetail): string[] {
  const issues: string[] = []
  for (const item of character.gear) {
    if (item.missingEnchant) issues.push(`${item.slotLabel} : pas d'enchantement`)
    if (item.emptySockets > 0) {
      issues.push(
        `${item.slotLabel} : ${item.emptySockets} châsse${item.emptySockets > 1 ? 's' : ''} vide${
          item.emptySockets > 1 ? 's' : ''
        }`
      )
    }
  }
  if (character.tierPieces > 0 && character.tierPieces < 4) {
    issues.push(`Set de tier incomplet (${character.tierPieces}/4 pièces)`)
  }
  return issues
}

/** Écart entre le pire slot équipé et l'ilvl moyen : repère les slots à retard. */
export function findWeakSlots(character: CharacterDetail, threshold = 6): string[] {
  if (!character.gear.length) return []
  const relevant = character.gear.filter((g) => g.itemLevel > 0 && g.slot !== 'TABARD' && g.slot !== 'SHIRT')
  if (!relevant.length) return []
  const avg = relevant.reduce((sum, g) => sum + g.itemLevel, 0) / relevant.length
  return relevant
    .filter((g) => avg - g.itemLevel >= threshold)
    .sort((a, b) => a.itemLevel - b.itemLevel)
    .map((g) => `${g.slotLabel} (${g.itemLevel})`)
}
