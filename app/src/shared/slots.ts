/**
 * Normalisation des slots d'objet.
 *
 * Attention : Blizzard utilise deux vocabulaires distincts.
 *  - Les slots d'un personnage équipé (`equipped_items[].slot.type`) valent
 *    HEAD, FINGER_1, TRINKET_2, HANDS, BACK, MAIN_HAND…
 *  - Le type d'inventaire d'un objet (`inventory_type.type`) vaut FINGER,
 *    TRINKET, HAND, CLOAK, ROBE, WEAPONMAINHAND…
 *
 * Confondre les deux fait échouer toute tentative de regrouper les
 * améliorations d'un droptimizer par emplacement. On ramène donc les types
 * d'inventaire à des groupes stables, indépendants de la langue.
 */

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
  // Toutes les armes tombent dans le même groupe : un droptimizer compare des
  // armes entre elles sans distinguer la main qui les porte.
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

/** Slots d'un personnage équipé, vers le même vocabulaire de groupes. */
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

/**
 * Nombre de pièces réellement portables sur un groupe. Deux pour les anneaux et
 * les bijoux : n'afficher qu'une seule amélioration y masquerait la moitié des
 * objets à farmer.
 */
export function slotCapacity(group: SlotGroup): number {
  return group === 'FINGER' || group === 'TRINKET' ? 2 : 1
}

/** Ordre d'affichage, calqué sur le panneau d'équipement en jeu. */
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
