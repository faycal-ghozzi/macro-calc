import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { ThemePicker } from '../components/ThemePicker'
import { LanguagePicker } from '../components/LanguagePicker'
import { UnitsPicker } from '../components/UnitsPicker'
import { MealReminderSettings } from '../components/MealReminderSettings'
import { PaywallModal } from '../components/PaywallModal'
import { BundleNudgeBanner } from '../components/BundleNudgeBanner'
import { useTheme } from '../theme/ThemeProvider'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'
import { useEntitlements } from '../hooks/useEntitlements'
import { useDowngradeUiStore } from '../store/useDowngradeUiStore'
import { useTour } from '../contexts/TourContext'
import { getFullTourSteps } from '../lib/tourSteps'
import { supabase } from '../lib/supabase'
import { PRODUCTS } from '../lib/products'
import { mirrorChevron } from '../lib/rtl'
import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator'

export default function SettingsScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const { user, signOut } = useAuth()
  const { updateProfile } = useProfile()
  const { startSequence } = useTour()

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14 }}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: theme.colors.backgroundElevated }]}
        >
          <Ionicons name={mirrorChevron('chevron-back')} size={19} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('settings.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="color-palette-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionAppearance')}</Text>
        </View>
        <ThemePicker />
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="language-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionLanguage')}</Text>
        </View>
        <LanguagePicker />
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="swap-horizontal-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionUnits')}</Text>
        </View>
        <UnitsPicker />
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="notifications-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionMealReminders')}</Text>
        </View>
        <MealReminderSettings />
      </Card>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync()
          startSequence(getFullTourSteps())
        }}
        style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}
      >
        <Ionicons name="play-circle-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{t('profile.replayTour')}</Text>
      </Pressable>

      <SubscriptionSection />

      <SecuritySection
        email={user?.email ?? ''}
        onSignOut={signOut}
        onRequestDeletion={() => updateProfile({ deletion_requested_at: new Date().toISOString() }).then(signOut)}
      />
    </Screen>
  )
}

function SubscriptionSection() {
  const theme = useTheme()
  const { t } = useTranslation()
  const { flags } = useEntitlements()
  const setDismissed = useDowngradeUiStore((s) => s.setDismissed)
  const [showProPaywall, setShowProPaywall] = useState(false)

  const planLabel = (() => {
    if (flags.isComped) return t('profile.compedAccount')
    if (flags.activeProductIds.includes('pro_bundle')) return t(PRODUCTS.pro_bundle.nameKey)
    if (flags.activeProductIds.length > 0) return t('profile.addOnsActive', { count: flags.activeProductIds.length })
    return t('profile.freePlan')
  })()

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="card-outline" size={15} color={theme.colors.textTertiary} />
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionSubscription')}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{planLabel}</Text>

      <BundleNudgeBanner activeProductIds={flags.activeProductIds} onPress={() => setShowProPaywall(true)} />

      {!flags.isComped && !flags.activeProductIds.includes('pro_bundle') && (
        <Pressable
          onPress={() => setShowProPaywall(true)}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.accentSoft, borderRadius: theme.style.cardRadius - 8 }]}
        >
          <Ionicons name="sparkles-outline" size={14} color={theme.colors.accent} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.accent }}>{t('profile.upgradeTo', { name: t(PRODUCTS.pro_bundle.nameKey) })}</Text>
        </Pressable>
      )}

      {flags.isSlotLocked && (
        <Pressable
          onPress={() => setDismissed(false)}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}
        >
          <Ionicons name="list-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{t('profile.reviewActiveItems')}</Text>
        </Pressable>
      )}

      <PaywallModal
        visible={showProPaywall}
        productId="pro_bundle"
        headline={t('profile.paywallSubscriptionHeadline')}
        onClose={() => setShowProPaywall(false)}
      />
    </Card>
  )
}

function SecuritySection({
  email,
  onSignOut,
  onRequestDeletion,
}: {
  email: string
  onSignOut: () => void
  onRequestDeletion: () => void
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const [newEmail, setNewEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [emailSucceeded, setEmailSucceeded] = useState(false)
  const [pwStatus, setPwStatus] = useState<string | null>(null)
  const [pwSucceeded, setPwSucceeded] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleEmailUpdate() {
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailStatus(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    setEmailSucceeded(!error)
    setEmailStatus(error ? error.message : t('profile.confirmationSentToNewEmail'))
    if (!error) { setNewEmail(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
  }

  async function handlePasswordUpdate() {
    if (newPw !== confirmPw) { setPwSucceeded(false); setPwStatus(t('profile.passwordsMismatch')); return }
    if (newPw.length < 8) { setPwSucceeded(false); setPwStatus(t('profile.passwordTooShort')); return }
    setPwLoading(true)
    setPwStatus(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInError) { setPwLoading(false); setPwSucceeded(false); setPwStatus(t('profile.currentPasswordIncorrect')); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    setPwSucceeded(!error)
    setPwStatus(error ? error.message : t('profile.passwordUpdated'))
    if (!error) { setCurrentPw(''); setNewPw(''); setConfirmPw(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="mail-outline" size={15} color={theme.colors.textTertiary} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionUpdateEmail')}</Text>
        </View>
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('profile.currentEmail', { email })}</Text>
        <TextInput
          placeholder={t('profile.newEmailPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        {emailStatus && (
          <Text style={{ fontSize: 11, color: emailSucceeded ? theme.colors.success : theme.colors.danger }}>{emailStatus}</Text>
        )}
        <Pressable
          onPress={handleEmailUpdate}
          disabled={emailLoading || !newEmail.trim()}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, opacity: emailLoading || !newEmail.trim() ? 0.4 : 1 }]}
        >
          {emailLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <Ionicons name="checkmark" size={14} color={theme.colors.textPrimary} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{t('profile.updateEmail')}</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="lock-closed-outline" size={15} color={theme.colors.textTertiary} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionChangePassword')}</Text>
        </View>
        <TextInput
          placeholder={t('profile.currentPasswordPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={currentPw}
          onChangeText={setCurrentPw}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <TextInput
          placeholder={t('profile.newPasswordPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={newPw}
          onChangeText={setNewPw}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <TextInput
          placeholder={t('profile.confirmNewPasswordPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={confirmPw}
          onChangeText={setConfirmPw}
          secureTextEntry
          style={[
            styles.input,
            { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 },
            confirmPw && confirmPw !== newPw ? { borderWidth: 1, borderColor: theme.colors.danger } : null,
          ]}
        />
        {pwStatus && (
          <Text style={{ fontSize: 11, color: pwSucceeded ? theme.colors.success : theme.colors.danger }}>{pwStatus}</Text>
        )}
        <Pressable
          onPress={handlePasswordUpdate}
          disabled={pwLoading || !currentPw || !newPw || newPw !== confirmPw}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, opacity: pwLoading || !currentPw || !newPw || newPw !== confirmPw ? 0.4 : 1 }]}
        >
          {pwLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <Ionicons name="checkmark" size={14} color={theme.colors.textPrimary} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{t('profile.updatePassword')}</Text>
        </Pressable>
      </Card>

      <Card>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSignOut() }} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={17} color={theme.colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.danger }}>{t('profile.signOut')}</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 10, borderWidth: 1, borderColor: theme.colors.danger + '33' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="warning-outline" size={15} color={theme.colors.danger} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionDangerZone')}</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            Alert.alert(
              t('profile.deleteConfirmTitle'),
              t('profile.deleteConfirmBody'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('profile.deleteAccount'), style: 'destructive', onPress: onRequestDeletion },
              ]
            )
          }}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.danger + '1A', borderRadius: theme.style.cardRadius - 8 }]}
        >
          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
})
