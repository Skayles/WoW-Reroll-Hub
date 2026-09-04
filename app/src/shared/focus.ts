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
import {
  contentKey,
  contentLabelKey,
  contentRank,
  type ContentCategory,
  type RaidDifficulty
} from './content'

export type TaggedUpgrade = DroptimizerUpgrade & {
  category: ContentCategory
  difficulty: RaidDifficulty | null
  labelKey: string
}

export function computeFocus(
  character: CharacterDetail,
  reports: DroptimizerReport[]
): CharacterFocus {
  const own = reports.filter((r) => r.characterId === character.id)

  const byContent = new Map<string, DroptimizerReport[]>()
  for (const report of own) {
    const key = contentKey(report.category, report.difficulty)
    const list = byContent.get(key)
    if (list) list.push(report)
    else byContent.set(key, [report])
  }

  const entries: FocusEntry[] = []
  for (const group of byContent.values()) {
    const { category, difficulty } = group[0]
    const upgrades = group
      .flatMap((r) => r.upgrades)
      .filter((u) => u.gainPct > 0)
      .sort((a, b) => b.gainPct - a.gainPct)

    const top3 = upgrades.slice(0, 3)
    const top3AvgPct = top3.length
      ? top3.reduce((sum, u) => sum + u.gainPct, 0) / top3.length
      : 0

    const top3AvgGain = top3.length
      ? top3.reduce((sum, u) => sum + u.gain, 0) / top3.length
      : 0

    entries.push({
      category,
      difficulty,
      labelKey: contentLabelKey(category, difficulty),
      bestGainPct: upgrades[0]?.gainPct ?? 0,
      bestGain: upgrades[0]?.gain ?? 0,
      top3AvgPct,
      top3AvgGain,
      upgradeCount: upgrades.length,
      bestItem: upgrades[0] ?? null,
      reportIds: group.map((r) => r.reportId)
    })
  }

  entries.sort(
    (a, b) =>
      b.top3AvgPct - a.top3AvgPct ||
      b.bestGainPct - a.bestGainPct ||
      contentRank(a.category, a.difficulty) - contentRank(b.category, b.difficulty)
  )

  return {
    characterId: character.id,
    entries,
    recommended: entries[0] ?? null,
    gearIssues: findGearIssues(character),
    bySlot: computeBySlot(own),
    computedAt: Date.now()
  }
}

export interface ContentScope {
  category: ContentCategory
  difficulty: RaidDifficulty | null
}

export function reportsFor(
  reports: DroptimizerReport[],
  characterId: string,
  scope: ContentScope | null
): DroptimizerReport[] {
  return reports.filter((report) => {
    if (report.characterId !== characterId) return false
    if (!scope) return true
    return contentKey(report.category, report.difficulty) === contentKey(scope.category, scope.difficulty)
  })
}

export function computeBySlot(reports: DroptimizerReport[]): SlotUpgrades[] {
  const bestByItem = new Map<number, TaggedUpgrade>()
  const unidentified: TaggedUpgrade[] = []

  for (const report of reports) {
    const labelKey = contentLabelKey(report.category, report.difficulty)
    for (const upgrade of report.upgrades) {
      if (upgrade.gainPct <= 0) continue
      const tagged: TaggedUpgrade = {
        ...upgrade,
        category: report.category,
        difficulty: report.difficulty,
        labelKey
      }

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

  slots.sort((a, b) => slotGroupRank(a.slotGroup) - slotGroupRank(b.slotGroup))
  return slots
}

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

export { ENCHANTABLE_SLOTS }
