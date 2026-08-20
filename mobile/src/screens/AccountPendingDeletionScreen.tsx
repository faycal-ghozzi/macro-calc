import { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { deletionPurgeDate } from '../lib/accountDeletion'

export default function AccountPendingDeletionScreen() {
  const theme = useTheme()
  const { signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [canceling, setCanceling] = useState(false)

  const purgeDate = deletionPurgeDate(profile)

  async function handleCancel() {
    setCanceling(true)
    await updateProfile({ deletion_requested_at: null })
    setCanceling(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  return (
    <Screen scroll={false}>
      <View style={styles.centerWrap}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.danger + '1A' }]}>
          <Ionicons name="warning-outline" size={32} color={theme.colors.danger} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Account scheduled for deletion</Text>
        <Text style={[styles.body, { color: theme.colors.textTertiary }]}>
          Your account and all your data will be permanently deleted
          {purgeDate ? ` on ${purgeDate.toLocaleDateString()}` : ' in 30 days'}. You can cancel any time before then.
        </Text>
        <Pressable
          onPress={handleCancel}
          disabled={canceling}
          style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: canceling ? 0.6 : 1 }]}
        >
          {canceling ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name="arrow-undo-outline" size={18} color={theme.colors.onAccent} />}
          <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Cancel Deletion</Text>
        </Pressable>
        <Pressable onPress={signOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.textTertiary} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textTertiary }}>Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  primaryButton: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
})
