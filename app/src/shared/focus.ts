import type {
  CharacterDetail,
  CharacterFocus,
  DroptimizerReport,
  DroptimizerUpgrade,
  FocusEntry,
  GearIssue,
  SlotUpgrades,
  WeakSlot
} from './types'
import { ENCHANTABLE_SLOTS } from './constants'
import { slotCapacity, slotGroupRank, type SlotGroup } from './slots'

/** Amélioration enrichie du contenu d'où elle provient. */
export type TaggedUpgrade = DroptimizerUpgrade & { contentTag: string }

/**
 * Classe les contenus simulés d'un personnage par potentiel de gain, et calcule
 * la meilleure pièce par emplacement.
 *
 * Le classement ne se base pas uniquement sur le meilleur objet : un seul objet
 * à +8 % dans un contenu où rien d'autre ne drop est moins intéressant qu'un
 * contenu où cinq objets rapportent +4 %. D'où le tri sur la moyenne des trois
 * meilleurs gains, le pic servant seulement de départage.
 */
export function computeFocus(
  character: CharacterDetail,
  reports: DroptimizerReport[]
): CharacterFocus {
  const own = reports.filter((r) => r.characterId === character.id)

  const byTag = new Map<string, DroptimizerReport[]>()
  for (const report of own) {
    const tag = contentTagOf(report)
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
    bySlot: computeBySlot(own),
    computedAt: Date.now()
  }
}

function contentTagOf(report: DroptimizerReport): string {
  return report.contentTag || report.contentLabel || 'Non classé'
}

/**
 * Meilleure amélioration par emplacement, tous rapports confondus.
 *
 * Sans ce regroupement, un droptimizer renvoie dix colliers concurrents alors
 * qu'un seul peut être porté : la question utile est « quelle pièce viser pour
 * ce slot », pas « quels sont les dix meilleurs objets ».
 *
 * Les anneaux et les bijoux gardent deux entrées, puisque deux se portent.
 */
export function computeBySlot(reports: DroptimizerReport[]): SlotUpgrades[] {
  // Un même objet peut apparaître dans plusieurs rapports : on ne conserve que
  // son meilleur gain, en mémorisant le contenu correspondant.
  const bestByItem = new Map<number, TaggedUpgrade>()
  const unidentified: TaggedUpgrade[] = []

  for (const report of reports) {
    const contentTag = contentTagOf(report)
    for (const upgrade of report.upgrades) {
      if (upgrade.gainPct <= 0) continue
      const tagged: TaggedUpgrade = { ...upgrade, contentTag }

      // itemId 0 = objet non résolu : il n'est pas dédoublonnable par identifiant.
      if (!upgrade.itemId) {
        unidentified.push(tagged)
        continue
      }
      const previous = bestByItem.get(upgrade.itemId)
      if (!previous || upgrade.gainPct > previous.gainPct) {
        bestByItem.set(upgrade.itemId, tagged)
      }
    }
  }

  const byGroup = new Map<SlotGroup, TaggedUpgrade[]>()
  for (const upgrade of [...bestByItem.values(), ...unidentified]) {
    const list = byGroup.get(upgrade.slotGroup)
    if (list) list.push(upgrade)
    else byGroup.set(upgrade.slotGroup, [upgrade])
  }

  const slots: SlotUpgrades[] = []
  for (const [slotGroup, list] of byGroup) {
    list.sort((a, b) => b.gainPct - a.gainPct)
    slots.push({
      slotGroup,
      upgrades: list.slice(0, slotCapacity(slotGroup)),
      candidateCount: list.length
    })
  }

  // Ordre du panneau d'équipement plutôt que par gain : on cherche un slot
  // précis dans cette liste, elle doit rester à la même place d'un perso à l'autre.
  slots.sort((a, b) => slotGroupRank(a.slotGroup) - slotGroupRank(b.slotGroup))
  return slots
}

/**
 * Problèmes détectables sans simulation : enchantements manquants et châsses
 * vides. Ce sont des gains gratuits, à traiter avant tout farm.
 *
 * Renvoyés sous forme structurée : l'application et l'addon les rendent chacun
 * dans leur propre langue.
 */
export function findGearIssues(character: CharacterDetail): GearIssue[] {
  const issues: GearIssue[] = []
  for (const item of character.gear) {
    if (item.missingEnchant) issues.push({ type: 'enchant', slot: item.slot })
    if (item.emptySockets > 0) {
      issues.push({ type: 'socket', slot: item.slot, count: item.emptySockets })
    }
  }
  if (character.tierPieces > 0 && character.tierPieces < 4) {
    issues.push({ type: 'tier', count: character.tierPieces })
  }
  return issues
}

/** Écart entre le pire slot équipé et l'ilvl moyen : repère les slots à retard. */
export function findWeakSlots(character: CharacterDetail, threshold = 6): WeakSlot[] {
  if (!character.gear.length) return []
  const relevant = character.gear.filter(
    (g) => g.itemLevel > 0 && g.slot !== 'TABARD' && g.slot !== 'SHIRT'
  )
  if (!relevant.length) return []

  const avg = relevant.reduce((sum, g) => sum + g.itemLevel, 0) / relevant.length
  return relevant
    .filter((g) => avg - g.itemLevel >= threshold)
    .sort((a, b) => a.itemLevel - b.itemLevel)
    .map((g) => ({ slot: g.slot, itemLevel: g.itemLevel }))
}

/** Utilisé par ENCHANTABLE_SLOTS côté synchro ; réexporté pour commodité. */
export { ENCHANTABLE_SLOTS }
