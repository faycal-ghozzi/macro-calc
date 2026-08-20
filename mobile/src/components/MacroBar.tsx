import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated'
import { useTheme } from '../theme/ThemeProvider'

interface MacroBarProps {
  label: string
  current: number
  target: number
  color: string
  unit?: string
}

export function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const theme = useTheme()
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const over = current > target
  const width = useSharedValue(0)

  useEffect(() => {
    width.value = withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) })
  }, [pct])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }))

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: over ? theme.colors.danger : theme.colors.textPrimary }]}>
          {Math.round(current)}{unit} <Text style={{ color: theme.colors.textTertiary }}>/ {Math.round(target)}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.pillRadius }]}>
        <Animated.View
          style={[
            styles.fill,
            animatedStyle,
            { backgroundColor: over ? theme.colors.danger : color, borderRadius: theme.style.pillRadius },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 12, fontWeight: '600' },
  track: { height: 7, overflow: 'hidden' },
  fill: { height: '100%' },
})
