import { ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTheme } from '../theme/ThemeProvider'

interface ModalScreenProps {
  visible: boolean
  title: string
  onClose: () => void
  leadingIcon?: string
  trailing?: ReactNode
  children: ReactNode
}

export function ModalScreen({ visible, title, onClose, leadingIcon = 'close', trailing, children }: ModalScreenProps) {
  const theme = useTheme()
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
            <Pressable onPress={onClose} style={[styles.iconBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name={leadingIcon} size={19} color={theme.colors.textSecondary} />
            </Pressable>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
            <View style={styles.iconBtn}>{trailing}</View>
          </View>
          {children}
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
})
