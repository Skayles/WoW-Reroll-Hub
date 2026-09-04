export type SlotGroup =
  | 'HEAD'
  | 'NECK'
  | 'SHOULDER'
  | 'BACK'
  | 'CHEST'
  | 'WRIST'
  | 'HANDS'
  | 'WAIST'
  | 'LEGS'
  | 'FEET'
  | 'FINGER'
  | 'TRINKET'
  | 'WEAPON'
  | 'OFFHAND'
  | 'SHIRT'
  | 'TABARD'
  | 'OTHER'

const INVENTORY_TYPE_TO_GROUP: Record<string, SlotGroup> = {
  HEAD: 'HEAD',
  NECK: 'NECK',
  SHOULDER: 'SHOULDER',
  CLOAK: 'BACK',
  BACK: 'BACK',
  CHEST: 'CHEST',
  ROBE: 'CHEST',
  WRIST: 'WRIST',
  HAND: 'HANDS',
  HANDS: 'HANDS',
  WAIST: 'WAIST',
  LEGS: 'LEGS',
  FEET: 'FEET',
  FINGER: 'FINGER',
  TRINKET: 'TRINKET',

  WEAPON: 'WEAPON',
  WEAPONMAINHAND: 'WEAPON',
  WEAPONOFFHAND: 'WEAPON',
  TWOHWEAPON: 'WEAPON',
  RANGED: 'WEAPON',
  RANGEDRIGHT: 'WEAPON',
  THROWN: 'WEAPON',
  SHIELD: 'OFFHAND',
  HOLDABLE: 'OFFHAND',
  SHIRT: 'SHIRT',
  BODY: 'SHIRT',
  TABARD: 'TABARD'
}

const EQUIPPED_SLOT_TO_GROUP: Record<string, SlotGroup> = {
  HEAD: 'HEAD',
  NECK: 'NECK',
  SHOULDER: 'SHOULDER',
  BACK: 'BACK',
  CHEST: 'CHEST',
  WRIST: 'WRIST',
  HANDS: 'HANDS',
  WAIST: 'WAIST',
  LEGS: 'LEGS',
  FEET: 'FEET',
  FINGER_1: 'FINGER',
  FINGER_2: 'FINGER',
  TRINKET_1: 'TRINKET',
  TRINKET_2: 'TRINKET',
  MAIN_HAND: 'WEAPON',
  OFF_HAND: 'OFFHAND',
  SHIRT: 'SHIRT',
  TABARD: 'TABARD'
}

export function groupForInventoryType(type: string | undefined | null): SlotGroup {
  if (!type) return 'OTHER'
  return INVENTORY_TYPE_TO_GROUP[type.toUpperCase()] ?? 'OTHER'
}

export function groupForEquippedSlot(slot: string | undefined | null): SlotGroup {
  if (!slot) return 'OTHER'
  return EQUIPPED_SLOT_TO_GROUP[slot.toUpperCase()] ?? 'OTHER'
}

export function slotCapacity(group: SlotGroup): number {
  return group === 'FINGER' || group === 'TRINKET' ? 2 : 1
}

export const SLOT_GROUP_ORDER: SlotGroup[] = [
  'HEAD',
  'NECK',
  'SHOULDER',
  'BACK',
  'CHEST',
  'WRIST',
  'HANDS',
  'WAIST',
  'LEGS',
  'FEET',
  'FINGER',
  'TRINKET',
  'WEAPON',
  'OFFHAND',
  'SHIRT',
  'TABARD',
  'OTHER'
]

export function slotGroupRank(group: SlotGroup): number {
  const index = SLOT_GROUP_ORDER.indexOf(group)
  return index < 0 ? SLOT_GROUP_ORDER.length : index
}
