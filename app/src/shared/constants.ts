export const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E',
  2: '#F58CBA',
  3: '#ABD473',
  4: '#FFF569',
  5: '#FFFFFF',
  6: '#C41F3B',
  7: '#0070DE',
  8: '#69CCF0',
  9: '#9482C9',
  10: '#00FF96',
  11: '#FF7D0A',
  12: '#A330C9',
  13: '#33937F'
}

export const DEFAULT_CLASS_COLOR = '#9aa4b2'

export function classColor(classId: number): string {
  return CLASS_COLORS[classId] ?? DEFAULT_CLASS_COLOR
}

export const SLOT_ORDER = [
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
  'FINGER_1',
  'FINGER_2',
  'TRINKET_1',
  'TRINKET_2',
  'MAIN_HAND',
  'OFF_HAND',
  'SHIRT',
  'TABARD'
]

export const ENCHANTABLE_SLOTS = new Set([
  'BACK',
  'CHEST',
  'WRIST',
  'LEGS',
  'FEET',
  'FINGER_1',
  'FINGER_2',
  'MAIN_HAND',
  'OFF_HAND'
])

export const QUALITY_COLORS: Record<string, string> = {
  POOR: '#9d9d9d',
  COMMON: '#ffffff',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
  ARTIFACT: '#e6cc80',
  HEIRLOOM: '#00ccff'
}

export function qualityColor(quality: string): string {
  return QUALITY_COLORS[quality] ?? '#ffffff'
}

export const WOW_FLAVORS: { id: string; label: string }[] = [
  { id: '_retail_', label: 'Retail' },
  { id: '_ptr_', label: 'PTR' },
  { id: '_classic_', label: 'Classic (Cata/MoP)' },
  { id: '_classic_era_', label: 'Classic Era' },
  { id: '_xptr_', label: 'XPTR' }
]

export const ADDON_NAME = 'RerollHelper'
