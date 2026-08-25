import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../theme/ThemeProvider'

// Blocking, full-screen: this app has no offline mode, so there's nothing
// useful to show behind it - just a calm, static state that clears itself
// automatically once useNetworkStatus reports back online.
export function OfflineScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const pulse = useSharedValue(0)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    )
  }, [pulse])

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
  }))

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={styles.root}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: theme.colors.accentSoft }, iconStyle]}>
          <Ionicons name="cloud-offline-outline" size={30} color={theme.colors.accent} />
        </Animated.View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('offline.title')}</Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t('offline.body')}</Text>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
})
