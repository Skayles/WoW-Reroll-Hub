export type ContentCategory = 'RAID' | 'MYTHIC_PLUS' | 'BONUS_ROLL' | 'OTHER'

export type RaidDifficulty = 'NORMAL' | 'HEROIC' | 'MYTHIC'

export const CATEGORIES: ContentCategory[] = ['RAID', 'MYTHIC_PLUS', 'BONUS_ROLL', 'OTHER']

export const RAID_DIFFICULTIES: RaidDifficulty[] = ['NORMAL', 'HEROIC', 'MYTHIC']

export function hasDifficulty(category: ContentCategory): boolean {
  return category === 'RAID'
}

export function contentKey(
  category: ContentCategory,
  difficulty: RaidDifficulty | null
): string {
  return hasDifficulty(category) && difficulty ? `${category}:${difficulty}` : category
}

const CATEGORY_RANK: Record<ContentCategory, number> = {
  RAID: 0,
  MYTHIC_PLUS: 1,
  BONUS_ROLL: 2,
  OTHER: 3
}

const DIFFICULTY_RANK: Record<RaidDifficulty, number> = {
  MYTHIC: 0,
  HEROIC: 1,
  NORMAL: 2
}

export function contentRank(
  category: ContentCategory,
  difficulty: RaidDifficulty | null
): number {
  return CATEGORY_RANK[category] * 10 + (difficulty ? DIFFICULTY_RANK[difficulty] : 0)
}

export function detectContent(title: string): {
  category: ContentCategory
  difficulty: RaidDifficulty | null
} {
  const text = title.toLowerCase()

  if (/mythic\s*\+|\bm\+|keystone|dungeon|donjon/.test(text)) {
    return { category: 'MYTHIC_PLUS', difficulty: null }
  }

  if (/bonus\s*roll|great\s*vault|coffre|vault/.test(text)) {
    return { category: 'BONUS_ROLL', difficulty: null }
  }

  const difficulty = detectDifficulty(text)
  if (difficulty || /\braid\b/.test(text)) {
    return { category: 'RAID', difficulty: difficulty ?? 'HEROIC' }
  }

  return { category: 'OTHER', difficulty: null }
}

function detectDifficulty(text: string): RaidDifficulty | null {
  if (/\bmythic\b|\bmythique\b/.test(text)) return 'MYTHIC'
  if (/\bheroic\b|\bhéroïque\b|\bheroique\b/.test(text)) return 'HEROIC'
  if (/\bnormal\b/.test(text)) return 'NORMAL'
  return null
}

export function contentLabelKey(
  category: ContentCategory,
  difficulty: RaidDifficulty | null
): string {
  return hasDifficulty(category) && difficulty
    ? `content.RAID.${difficulty}`
    : `content.${category}`
}
