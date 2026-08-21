import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { PRODUCTS, type ProductId } from '../lib/products'
import { purchaseProduct } from '../lib/purchases'

interface PaywallModalProps {
  visible: boolean
  productId: ProductId | null
  headline?: string
  onClose: () => void
}

export function PaywallModal({ visible, productId, headline, onClose }: PaywallModalProps) {
  const theme = useTheme()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [purchasing, setPurchasing] = useState(false)
  const product = productId ? PRODUCTS[productId] : null

  async function handleSubscribe() {
    if (!productId) return
    Haptics.selectionAsync()
    setPurchasing(true)
    const ok = await purchaseProduct(productId)
    setPurchasing(false)
    if (ok) onClose()
  }

  if (!product) return null
  const price = billing === 'monthly' ? product.monthlyPrice : product.annualPrice

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.style.cardRadius + 6, borderTopRightRadius: theme.style.cardRadius + 6 }]}
        >
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.accentSoft }]}>
              <Ionicons name="lock-open-outline" size={22} color={theme.colors.accent} />
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.headline, { color: theme.colors.textPrimary }]}>{headline ?? product.name}</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{product.description}</Text>

          <View style={[styles.billingToggle, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
            {(['monthly', 'annual'] as const).map((b) => (
              <Pressable
                key={b}
                onPress={() => { Haptics.selectionAsync(); setBilling(b) }}
                style={[styles.billingButton, { borderRadius: theme.style.cardRadius - 10 }, billing === b && { backgroundColor: theme.colors.accent }]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: billing === b ? theme.colors.onAccent : theme.colors.textSecondary }}>
                  {b === 'monthly' ? 'Monthly' : 'Annual'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.price, { color: theme.colors.textPrimary }]}>
            ${price.toFixed(2)}
            <Text style={{ fontSize: 13, fontWeight: '500', color: theme.colors.textTertiary }}> / {billing === 'monthly' ? 'mo' : 'yr'}</Text>
          </Text>

          <Pressable
            onPress={handleSubscribe}
            disabled={purchasing}
            style={[styles.subscribeButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: purchasing ? 0.6 : 1 }]}
          >
            {purchasing ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
            <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Subscribe</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 13, textAlign: 'center' }}>Maybe later</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headline: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  billingToggle: { flexDirection: 'row', padding: 4, gap: 4, marginBottom: 14 },
  billingButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  price: { fontSize: 26, fontWeight: '800', marginBottom: 18 },
  subscribeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
})
