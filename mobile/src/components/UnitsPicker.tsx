import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useUnitsStore, UnitSystem } from '../store/useUnitsStore'

export function UnitsPicker() {
  const theme = useTheme()
  const { t } = useTranslation()
  const system = useUnitsStore((s) => s.system)
  const setSystem = useUnitsStore((s) => s.setSystem)

  const options: { value: UnitSystem; labelKey: string }[] = [
    { value: 'metric', labelKey: 'profile.metric' },
    { value: 'imperial', labelKey: 'profile.imperial' },
  ]

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => { Haptics.selectionAsync(); setSystem(o.value) }}
          style={[
            styles.chip,
            { flex: 1, backgroundColor: system === o.value ? theme.colors.accent : theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 },
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: system === o.value ? theme.colors.onAccent : theme.colors.textSecondary }}>{t(o.labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 11, alignItems: 'center' },
})
