import type { BrowserWindow } from 'electron'
import type {
  CharacterDetail,
  CharacterStats,
  GearItem,
  MythicPlusInfo,
  ProfessionEntry,
  RaidProgressEntry,
  Region,
  SyncProgress,
  SyncResult
} from '@shared/types'
import { ENCHANTABLE_SLOTS } from '@shared/constants'
import { t } from './i18n'
import { apiGet, getAccountProfile, localized, type AccountCharacter } from './blizzard'
import { store } from './store'

const TANK_SPECS = new Set([250, 581, 104, 268, 66, 73])
const HEALER_SPECS = new Set([105, 270, 65, 256, 257, 264, 1468])

function roleForSpec(specId: number | undefined): CharacterDetail['role'] {
  if (specId === undefined) return null
  if (TANK_SPECS.has(specId)) return 'TANK'
  if (HEALER_SPECS.has(specId)) return 'HEALER'
  return 'DAMAGE'
}

export function characterId(region: Region, realmSlug: string, name: string): string {
  return `${region}:${realmSlug}:${name.toLowerCase()}`
}

interface SummaryResponse {
  name: string
  level: number
  guild?: { name?: unknown }
  character_class: { id: number; name?: unknown }
  race: { id: number; name?: unknown }
  active_spec?: { id: number; name?: unknown }
  faction: { type: string }
  equipped_item_level?: number
  average_item_level?: number
  covenant_progress?: { chosen_covenant?: { name?: unknown } }
}

interface EquipmentResponse {
  equipped_items?: {
    slot: { type: string; name?: unknown }
    item: { id: number }
    name?: unknown
    quality: { type: string }
    level?: { value: number }
    item_class?: { id: number }
    enchantments?: { display_string?: unknown; enchantment_slot?: { type: string } }[]
    sockets?: { socket_type?: { type: string }; item?: { id: number } }[]
    set?: { item_set?: { id: number } }
  }[]
}

interface StatisticsResponse {
  health?: number
  strength?: { effective: number }
  agility?: { effective: number }
  intellect?: { effective: number }
  stamina?: { effective: number }
  melee_crit?: { value: number }
  spell_crit?: { value: number }
  melee_haste?: { value: number }
  mastery?: { value: number }
  versatility_damage_done_bonus?: number
  armor?: { effective: number }
  dodge?: { value: number }
  parry?: { value: number }
  block?: { value: number }
}

interface MythicResponse {
  current_mythic_rating?: { rating: number }
  current_period?: {
    best_runs?: {
      keystone_level: number
      mythic_rating?: { rating: number }
      dungeon: { name?: unknown }
    }[]
  }
}

interface RaidsResponse {
  expansions?: {
    expansion: { id: number; name?: unknown }
    instances?: {
      instance: { name?: unknown }
      modes?: {
        difficulty: { type: string; name?: unknown }
        progress?: { completed_count: number; total_count: number }
      }[]
    }[]
  }[]
}

interface ProfessionsResponse {
  primaries?: {
    profession: { name?: unknown }
    tiers?: { skill_points?: number; max_skill_points?: number }[]
  }[]
}

interface MediaResponse {
  assets?: { key: string; value: string }[]
}

let syncing = false

export function isSyncing(): boolean {
  return syncing
}

export async function syncAll(win: BrowserWindow | null): Promise<SyncResult> {
  if (syncing) {
    return { ok: false, characterCount: 0, failed: [], error: t('err.syncRunning') }
  }
  syncing = true

  const emit = (progress: SyncProgress): void => {
    win?.webContents.send('sync:progress', progress)
  }

  try {
    emit({ phase: 'account', current: 0, total: 0, label: t('sync.account') })

    const settings = store.getSettings()
    const profile = await getAccountProfile()
    const refs: { char: AccountCharacter; accountLabel: string }[] = []

    const accounts = profile.wow_accounts ?? []
    accounts.forEach((account, index) => {
      const label = accounts.length > 1 ? `#${index + 1}` : ''
      for (const char of account.characters ?? []) {
        if (char.level >= settings.minLevel) refs.push({ char, accountLabel: label })
      }
    })

    if (!refs.length) {
      const message =
        accounts.length === 0
          ? t('err.noAccounts')
          : t('err.noCharacters', { level: settings.minLevel })
      emit({ phase: 'error', current: 0, total: 0, label: message, error: message })
      return { ok: false, characterCount: 0, failed: [], error: message }
    }

    const failed: SyncResult['failed'] = []
    let done = 0

    const BATCH = 6
    for (let i = 0; i < refs.length; i += BATCH) {
      const batch = refs.slice(i, i + BATCH)
      await Promise.all(
        batch.map(async ({ char, accountLabel }) => {
          const displayName = `${char.name}-${localized(char.realm.name) || char.realm.slug}`
          try {
            const detail = await fetchCharacter(char, accountLabel, settings.region)
            store.mutate((data) => {
              data.characters[detail.id] = detail
            })
          } catch (err) {
            failed.push({ name: displayName, reason: (err as Error).message })
          } finally {
            done++
            emit({
              phase: 'characters',
              current: done,
              total: refs.length,
              label: displayName
            })
          }
        })
      )
    }

    store.mutate((data) => {
      data.lastSyncAt = Date.now()
    })

    const count = refs.length - failed.length
    emit({ phase: 'done', current: done, total: refs.length, label: t('common.characters', { count }) })
    return { ok: true, characterCount: count, failed }
  } catch (err) {
    const message = (err as Error).message
    emit({ phase: 'error', current: 0, total: 0, label: message, error: message })
    return { ok: false, characterCount: 0, failed: [], error: message }
  } finally {
    syncing = false
  }
}

export async function syncOne(id: string): Promise<CharacterDetail | null> {
  const existing = store.getData().characters[id]
  if (!existing) throw new Error(t('err.unknownCharacter'))

  const fake: AccountCharacter = {
    name: existing.name,
    id: 0,
    level: existing.level,
    realm: { slug: existing.realmSlug, id: 0, name: existing.realm },
    playable_class: { id: existing.classId, name: existing.className },
    playable_race: { id: 0, name: existing.raceName },
    faction: { type: existing.faction },
    gender: { type: 'MALE' },
    character: { href: '' }
  }

  const detail = await fetchCharacter(fake, existing.accountLabel, existing.region)
  store.mutate((data) => {
    data.characters[detail.id] = detail
  })
  return detail
}

async function fetchCharacter(
  char: AccountCharacter,
  accountLabel: string,
  region: Region
): Promise<CharacterDetail> {
  const realmSlug = char.realm.slug
  const nameSlug = encodeURIComponent(char.name.toLowerCase())
  const base = `/profile/wow/character/${realmSlug}/${nameSlug}`
  const warnings: string[] = []

  const summary = await apiGet<SummaryResponse>(base)
  if (!summary) throw new Error(t('err.profileUnavailable'))

  const [equipment, statistics, mythic, raids, professions, media] = await Promise.all([
    safe(() => apiGet<EquipmentResponse>(`${base}/equipment`, { optional: true }), warnings, 'equipment'),
    safe(() => apiGet<StatisticsResponse>(`${base}/statistics`, { optional: true }), warnings, 'statistics'),
    safe(() => apiGet<MythicResponse>(`${base}/mythic-keystone-profile`, { optional: true }), warnings, 'mythicplus'),
    safe(() => apiGet<RaidsResponse>(`${base}/encounters/raids`, { optional: true }), warnings, 'raids'),
    safe(() => apiGet<ProfessionsResponse>(`${base}/professions`, { optional: true }), warnings, 'professions'),
    safe(() => apiGet<MediaResponse>(`${base}/character-media`, { optional: true }), warnings, 'media')
  ])

  const gear = parseGear(equipment)

  return {
    id: characterId(region, realmSlug, char.name),
    name: summary.name || char.name,
    realm: localized(char.realm.name) || realmSlug,
    realmSlug,
    region,
    level: summary.level ?? char.level,
    className: localized(summary.character_class?.name) || localized(char.playable_class.name),
    classId: summary.character_class?.id ?? char.playable_class.id,
    raceName: localized(summary.race?.name) || localized(char.playable_race.name),
    faction: (summary.faction?.type ?? char.faction.type) as CharacterDetail['faction'],
    accountLabel,
    syncedAt: Date.now(),
    specName: localized(summary.active_spec?.name) || null,
    role: roleForSpec(summary.active_spec?.id),
    equippedItemLevel: Math.round(summary.equipped_item_level ?? 0),
    averageItemLevel: Math.round(summary.average_item_level ?? 0),
    guild: localized(summary.guild?.name) || null,
    covenantOrHero: localized(summary.covenant_progress?.chosen_covenant?.name) || null,
    gear,
    stats: parseStats(statistics),
    mythicPlus: parseMythic(mythic),
    raids: parseRaids(raids),
    professions: parseProfessions(professions),
    tierPieces: gear.filter((g) => g.setBonusId !== null).length,
    avatarUrl: media?.assets?.find((a) => a.key === 'avatar')?.value ?? null,
    warnings
  }
}

async function safe<T>(
  fn: () => Promise<T | null>,
  warnings: string[],
  label: string
): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    warnings.push(`${label} : ${(err as Error).message}`)
    return null
  }
}

function parseGear(equipment: EquipmentResponse | null): GearItem[] {
  if (!equipment?.equipped_items) return []
  return equipment.equipped_items.map((item) => {
    const slot = item.slot.type
    const sockets = item.sockets ?? []
    const enchantments = (item.enchantments ?? []).filter(
      (e) => e.enchantment_slot?.type !== 'TEMPORARY'
    )

    const enchantable =
      ENCHANTABLE_SLOTS.has(slot) && (slot !== 'OFF_HAND' || item.item_class?.id === 2)

    return {
      slot,
      itemId: item.item.id,
      name: localized(item.name),
      itemLevel: item.level?.value ?? 0,
      quality: item.quality.type,
      enchantment: enchantments.length ? localized(enchantments[0].display_string) : null,
      sockets: sockets.length,
      emptySockets: sockets.filter((s) => !s.item).length,
      missingEnchant: enchantable && enchantments.length === 0,
      setBonusId: item.set?.item_set?.id ?? null
    }
  })
}

function parseStats(stats: StatisticsResponse | null): CharacterStats | null {
  if (!stats) return null

  const candidates: { name: string; value: number }[] = [
    { name: 'strength', value: stats.strength?.effective ?? 0 },
    { name: 'agility', value: stats.agility?.effective ?? 0 },
    { name: 'intellect', value: stats.intellect?.effective ?? 0 }
  ]
  const primary = candidates.reduce((best, c) => (c.value > best.value ? c : best))

  return {
    health: stats.health ?? 0,
    primary: primary.value > 0 ? primary : null,
    stamina: stats.stamina?.effective ?? 0,

    crit: Math.max(stats.melee_crit?.value ?? 0, stats.spell_crit?.value ?? 0),
    haste: stats.melee_haste?.value ?? 0,
    mastery: stats.mastery?.value ?? 0,
    versatility: stats.versatility_damage_done_bonus ?? 0,
    armor: stats.armor?.effective ?? 0,
    dodge: stats.dodge?.value ?? 0,
    parry: stats.parry?.value ?? 0,
    block: stats.block?.value ?? 0
  }
}

function parseMythic(mythic: MythicResponse | null): MythicPlusInfo | null {
  if (!mythic) return null
  return {
    rating: Math.round(mythic.current_mythic_rating?.rating ?? 0),
    bestRuns: (mythic.current_period?.best_runs ?? [])
      .map((run) => ({
        dungeon: localized(run.dungeon?.name),
        level: run.keystone_level,
        score: Math.round(run.mythic_rating?.rating ?? 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }
}

function parseRaids(raids: RaidsResponse | null): RaidProgressEntry[] {
  if (!raids?.expansions?.length) return []

  const latest = raids.expansions.reduce((best, exp) =>
    exp.expansion.id > best.expansion.id ? exp : best
  )

  const entries: RaidProgressEntry[] = []
  for (const instance of latest.instances ?? []) {
    for (const mode of instance.modes ?? []) {
      const progress = mode.progress
      if (!progress || progress.completed_count === 0) continue
      entries.push({
        raid: localized(instance.instance.name),
        difficulty: localized(mode.difficulty.name) || mode.difficulty.type,
        killed: progress.completed_count,
        total: progress.total_count
      })
    }
  }
  return entries
}

function parseProfessions(professions: ProfessionsResponse | null): ProfessionEntry[] {
  if (!professions?.primaries) return []
  return professions.primaries.map((primary) => {
    const tier = primary.tiers?.[primary.tiers.length - 1]
    return {
      name: localized(primary.profession.name),
      skill: tier?.skill_points ?? 0,
      maxSkill: tier?.max_skill_points ?? 0
    }
  })
}
