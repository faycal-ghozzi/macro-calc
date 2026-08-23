import { I18nManager } from 'react-native'

const CHEVRON_MIRROR: Record<string, string> = {
  'chevron-back': 'chevron-forward',
  'chevron-forward': 'chevron-back',
  'chevron-back-outline': 'chevron-forward-outline',
  'chevron-forward-outline': 'chevron-back-outline',
}

// Ionicons glyphs are fixed images - unlike RN's own layout/flexDirection
// mirroring, they don't flip automatically when I18nManager.isRTL is true.
// Chevrons have an exact mirror-image glyph, so swap names instead of
// transform-flipping (keeps anti-aliasing crisp).
export function mirrorChevron(name: string): string {
  return I18nManager.isRTL ? (CHEVRON_MIRROR[name] ?? name) : name
}

// For icons with no distinct mirrored glyph (e.g. arrow-undo-outline),
// flip visually via transform instead.
export function rtlFlipStyle() {
  return I18nManager.isRTL ? { transform: [{ scaleX: -1 as const }] } : undefined
}
