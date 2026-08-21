import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTheme } from '../theme/ThemeProvider'
import { PRODUCTS, type ProductId } from '../lib/products'
import { activeIndividualCount, bundleSavings } from '../lib/entitlements'

interface BundleNudgeBannerProps {
  activeProductIds: ProductId[]
  billing?: 'monthly' | 'annual'
  onPress: () => void
}

export function BundleNudgeBanner({ activeProductIds, billing = 'monthly', onPress }: BundleNudgeBannerProps) {
  const theme = useTheme()

  if (activeProductIds.includes('pro_bundle')) return null
  if (activeIndividualCount(activeProductIds) < 2) return null

  const savings = bundleSavings(activeProductIds, billing)
  if (savings <= 0) return null

  return (
    <Pressable
      onPress={onPress}
      style={[styles.banner, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.style.cardRadius - 4 }]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent }]}>
        <Ionicons name="sparkles" size={16} color={theme.colors.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Switch to {PRODUCTS.pro_bundle.name} and save ${savings.toFixed(2)}/{billing === 'monthly' ? 'mo' : 'yr'}
        </Text>
        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
          You're paying for {activeIndividualCount(activeProductIds)} add-ons separately
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconCircle: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '700' },
})
