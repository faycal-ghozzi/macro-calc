import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useThemeStore } from '../store/useThemeStore'
import { THEMES, THEME_ORDER } from '../theme/themes'

export function ThemePicker() {
  const theme = useTheme()
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)

  return (
    <View style={{ gap: 10 }}>
      {THEME_ORDER.map((id) => {
        const t = THEMES[id]
        const selected = id === themeId
        return (
          <Pressable
            key={id}
            onPress={() => { Haptics.selectionAsync(); setThemeId(id) }}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.backgroundElevated,
                borderRadius: theme.style.cardRadius - 8,
                borderWidth: selected ? 1.5 : 0,
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <View style={styles.swatchStack}>
              {t.swatch.map((c, i) => (
                <View key={i} style={[styles.swatchDot, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8 }]} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{t.name}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }}>{t.tagline}</Text>
            </View>
            {selected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  swatchStack: { flexDirection: 'row' },
  swatchDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#00000022' },
})
