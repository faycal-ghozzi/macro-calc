import { View, Text, Pressable, StyleSheet, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import QRCode from 'react-native-qrcode-svg'
import { useTheme } from '../theme/ThemeProvider'

interface MetaItem {
  label: string
  color: string
}

interface ShareQRModalProps {
  visible: boolean
  title: string
  qrValue: string
  heading: string
  meta: MetaItem[]
  hint: string
  onClose: () => void
}

export function ShareQRModal({ visible, title, qrValue, heading, meta, hint, onClose }: ShareQRModalProps) {
  const theme = useTheme()
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.style.cardRadius + 6, borderTopRightRadius: theme.style.cardRadius + 6 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.qrWrap}>
              <QRCode value={qrValue} size={210} backgroundColor="#FFFFFF" color="#0B0D10" />
            </View>
            <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>{heading}</Text>
            <View style={styles.metaRow}>
              {meta.map((m) => (
                <Text key={m.label} style={{ fontSize: 12, fontWeight: '600', color: m.color }}>{m.label}</Text>
              ))}
            </View>
            <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>{hint}</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 15, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { alignItems: 'center', gap: 14, paddingBottom: 16 },
  qrWrap: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18 },
  heading: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: 11, marginTop: 2 },
})
