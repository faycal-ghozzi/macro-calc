import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useThemeStore } from '../store/useThemeStore'
import { THEMES, THEME_ORDER } from '../theme/themes'
import { useEntitlements } from '../hooks/useEntitlements'
import { PaywallModal } from './PaywallModal'

export function ThemePicker() {
  const theme = useTheme()
  const { t } = useTranslation()
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const { flags } = useEntitlements()
  const [showThemePaywall, setShowThemePaywall] = useState(false)

  return (
    <View style={{ gap: 10 }}>
      {THEME_ORDER.map((id) => {
        const entry = THEMES[id]
        const selected = id === themeId
        const locked = id !== 'dark' && !flags.hasAllThemes
        return (
          <Pressable
            key={id}
            onPress={() => {
              Haptics.selectionAsync()
              if (locked) { setShowThemePaywall(true); return }
              setThemeId(id)
            }}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.backgroundElevated,
                borderRadius: theme.style.cardRadius - 8,
                borderWidth: selected ? 1.5 : 0,
                borderColor: theme.colors.accent,
                opacity: locked ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.swatchStack}>
              {entry.swatch.map((c, i) => (
                <View key={i} style={[styles.swatchDot, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8 }]} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{t(entry.nameKey)}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }}>{t(entry.taglineKey)}</Text>
            </View>
            {locked ? (
              <Ionicons name="lock-closed" size={16} color={theme.colors.textTertiary} />
            ) : selected ? (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
            ) : null}
          </Pressable>
        )
      })}

      <PaywallModal
        visible={showThemePaywall}
        productId="all_themes"
        headline={t('themes.paywallHeadline')}
        onClose={() => setShowThemePaywall(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  swatchStack: { flexDirection: 'row' },
  swatchDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#00000022' },
})
