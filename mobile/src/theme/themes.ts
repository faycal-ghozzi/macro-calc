export type ThemeId = 'dark' | 'light' | 'warm' | 'bold'

export interface ThemeColors {
  background: string
  backgroundElevated: string
  card: string
  cardBorder: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  accent: string
  accentSoft: string
  onAccent: string
  calories: string
  protein: string
  carbs: string
  fat: string
  success: string
  warning: string
  danger: string
  divider: string
  overlay: string
}

export interface ThemeStyle {
  cardRadius: number
  pillRadius: number
  ringThickness: number
  ringTrackOpacity: number
  ringCap: 'round' | 'butt'
  cardBorderWidth: number
  shadowOpacity: number
}

export interface Theme {
  id: ThemeId
  name: string
  tagline: string
  mode: 'dark' | 'light'
  colors: ThemeColors
  style: ThemeStyle
  swatch: [string, string, string]
}

export const THEMES: Record<ThemeId, Theme> = {
  dark: {
    id: 'dark',
    name: 'Midnight',
    tagline: 'Premium dark, refined contrast',
    mode: 'dark',
    colors: {
      background: '#0B0D10',
      backgroundElevated: '#14171B',
      card: '#181C21',
      cardBorder: '#262B31',
      textPrimary: '#F5F6F7',
      textSecondary: '#9BA3AE',
      textTertiary: '#5B6470',
      accent: '#34D399',
      accentSoft: 'rgba(52,211,153,0.14)',
      onAccent: '#04140D',
      calories: '#FB923C',
      protein: '#34D399',
      carbs: '#60A5FA',
      fat: '#F472B6',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      divider: '#22262C',
      overlay: 'rgba(0,0,0,0.65)',
    },
    style: {
      cardRadius: 22,
      pillRadius: 999,
      ringThickness: 10,
      ringTrackOpacity: 0.12,
      ringCap: 'round',
      cardBorderWidth: 1,
      shadowOpacity: 0.35,
    },
    swatch: ['#0B0D10', '#34D399', '#60A5FA'],
  },
  light: {
    id: 'light',
    name: 'Daylight',
    tagline: 'Clean, minimal, high contrast',
    mode: 'light',
    colors: {
      background: '#FFFFFF',
      backgroundElevated: '#F6F7F9',
      card: '#FFFFFF',
      cardBorder: '#E6E8EC',
      textPrimary: '#12151A',
      textSecondary: '#5B6470',
      textTertiary: '#9BA3AE',
      accent: '#4F46E5',
      accentSoft: 'rgba(79,70,229,0.08)',
      onAccent: '#FFFFFF',
      calories: '#EA580C',
      protein: '#4F46E5',
      carbs: '#0284C7',
      fat: '#DB2777',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
      divider: '#EEF0F3',
      overlay: 'rgba(15,23,32,0.4)',
    },
    style: {
      cardRadius: 20,
      pillRadius: 999,
      ringThickness: 9,
      ringTrackOpacity: 0.08,
      ringCap: 'round',
      cardBorderWidth: 1,
      shadowOpacity: 0.06,
    },
    swatch: ['#FFFFFF', '#4F46E5', '#0284C7'],
  },
  warm: {
    id: 'warm',
    name: 'Terra',
    tagline: 'Warm, earthy, softer wellness feel',
    mode: 'light',
    colors: {
      background: '#FBF3EA',
      backgroundElevated: '#F5E9D9',
      card: '#FFFCF7',
      cardBorder: '#E9D7BE',
      textPrimary: '#3A2E24',
      textSecondary: '#7A6753',
      textTertiary: '#AA9679',
      accent: '#C1603D',
      accentSoft: 'rgba(193,96,61,0.13)',
      onAccent: '#FFFCF7',
      calories: '#C1603D',
      protein: '#6B8E5A',
      carbs: '#D4A537',
      fat: '#8C7355',
      success: '#6B8E5A',
      warning: '#D4A537',
      danger: '#B5533C',
      divider: '#EEDFC8',
      overlay: 'rgba(58,46,36,0.45)',
    },
    style: {
      cardRadius: 28,
      pillRadius: 999,
      ringThickness: 12,
      ringTrackOpacity: 0.16,
      ringCap: 'round',
      cardBorderWidth: 1,
      shadowOpacity: 0.08,
    },
    swatch: ['#FBF3EA', '#C1603D', '#6B8E5A'],
  },
  bold: {
    id: 'bold',
    name: 'Voltage',
    tagline: 'High-contrast, vibrant, energetic',
    mode: 'dark',
    colors: {
      background: '#08080D',
      backgroundElevated: '#121220',
      card: '#15152A',
      cardBorder: '#2A2A48',
      textPrimary: '#FFFFFF',
      textSecondary: '#A9A9CC',
      textTertiary: '#6D6D93',
      accent: '#FF4D6D',
      accentSoft: 'rgba(255,77,109,0.16)',
      onAccent: '#0A0A12',
      calories: '#FF4D6D',
      protein: '#39FF88',
      carbs: '#FFD23D',
      fat: '#8B5CFF',
      success: '#39FF88',
      warning: '#FFD23D',
      danger: '#FF4D6D',
      divider: '#26264A',
      overlay: 'rgba(0,0,0,0.72)',
    },
    style: {
      cardRadius: 16,
      pillRadius: 999,
      ringThickness: 14,
      ringTrackOpacity: 0.14,
      ringCap: 'butt',
      cardBorderWidth: 1.5,
      shadowOpacity: 0.4,
    },
    swatch: ['#08080D', '#FF4D6D', '#39FF88'],
  },
}

export const THEME_ORDER: ThemeId[] = ['dark', 'light', 'warm', 'bold']
