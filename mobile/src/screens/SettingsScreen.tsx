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
import { PRODUCTS, INDIVIDUAL_PRODUCT_IDS, type ProductId } from '../lib/products'
import { wouldApproachBundle } from '../lib/entitlements'
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

const ADDON_ICONS: Record<ProductId, string> = {
  remove_ads: 'eye-off-outline',
  unlimited_meals_favorites: 'infinite-outline',
  qr_sharing_unlimited: 'qr-code-outline',
  advanced_reports: 'bar-chart-outline',
  all_themes: 'color-palette-outline',
  pro_bundle: 'sparkles-outline',
}

function AddOnRow({ id, active, busy, onActivate, onDeactivate }: {
  id: ProductId
  active: boolean
  busy: boolean
  onActivate: () => void
  onDeactivate: () => void
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const product = PRODUCTS[id]

  return (
    <Pressable
      onPress={active ? onDeactivate : onActivate}
      disabled={busy}
      style={[styles.addOnRow, { borderColor: theme.colors.cardBorder, opacity: busy ? 0.6 : 1 }]}
    >
      <View style={[styles.addOnIcon, { backgroundColor: theme.colors.backgroundElevated }]}>
        <Ionicons name={ADDON_ICONS[id]} size={16} color={theme.colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{t(product.nameKey)}</Text>
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary }} numberOfLines={1}>{t(product.descriptionKey)}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={theme.colors.textTertiary} />
      ) : active ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.success }}>{t('profile.addOnActive')}</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.accent }}>
          ${product.monthlyPrice.toFixed(2)}{t('paywall.perMonth')}
        </Text>
      )}
    </Pressable>
  )
}

function SubscriptionSection() {
  const theme = useTheme()
  const { t } = useTranslation()
  const { flags, activateProduct, deactivateProduct } = useEntitlements()
  const setDismissed = useDowngradeUiStore((s) => s.setDismissed)
  const [paywallProduct, setPaywallProduct] = useState<ProductId | null>(null)
  const [busyProduct, setBusyProduct] = useState<ProductId | null>(null)

  async function doActivate(id: ProductId) {
    Haptics.selectionAsync()
    setBusyProduct(id)
    const ok = await activateProduct(id)
    setBusyProduct(null)
    if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  function confirmActivate(id: ProductId) {
    const product = PRODUCTS[id]
    Alert.alert(
      t('profile.activateConfirmTitle', { name: t(product.nameKey) }),
      t('profile.activateConfirmBody', { price: `$${product.monthlyPrice.toFixed(2)}${t('paywall.perMonth')}` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.activate'), onPress: () => doActivate(id) },
      ]
    )
  }

  function handleActivate(id: ProductId) {
    if (wouldApproachBundle(flags.activeProductIds, id)) {
      Alert.alert(
        t('profile.upsellTitle'),
        t('profile.upsellBody', { name: t(PRODUCTS.pro_bundle.nameKey) }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.seeProBundle', { name: t(PRODUCTS.pro_bundle.nameKey) }), onPress: () => setPaywallProduct('pro_bundle') },
          { text: t('profile.activateAnyway'), onPress: () => confirmActivate(id) },
        ]
      )
      return
    }
    confirmActivate(id)
  }

  async function doDeactivate(id: ProductId) {
    Haptics.selectionAsync()
    setBusyProduct(id)
    await deactivateProduct(id)
    setBusyProduct(null)
  }

  function handleDeactivate(id: ProductId) {
    const product = PRODUCTS[id]
    Alert.alert(
      t('profile.deactivateConfirmTitle', { name: t(product.nameKey) }),
      t('profile.deactivateConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.deactivate'), style: 'destructive', onPress: () => doDeactivate(id) },
      ]
    )
  }

  const planLabel = (() => {
    if (flags.isComped) return t('profile.compedAccount')
    if (flags.activeProductIds.includes('pro_bundle')) return t(PRODUCTS.pro_bundle.nameKey)
    if (flags.activeProductIds.length > 0) return t('profile.addOnsActive', { count: flags.activeProductIds.length })
    return t('profile.freePlan')
  })()

  const hasEverything = flags.isComped || flags.activeProductIds.includes('pro_bundle')

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="card-outline" size={15} color={theme.colors.textTertiary} />
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionSubscription')}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{planLabel}</Text>

      <BundleNudgeBanner activeProductIds={flags.activeProductIds} onPress={() => setPaywallProduct('pro_bundle')} />

      {!hasEverything && (
        <Pressable
          onPress={() => setPaywallProduct('pro_bundle')}
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

      {!hasEverything && (
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionAddOns')}</Text>
          {INDIVIDUAL_PRODUCT_IDS.map((id) => (
            <AddOnRow
              key={id}
              id={id}
              active={flags.activeProductIds.includes(id)}
              busy={busyProduct === id}
              onActivate={() => handleActivate(id)}
              onDeactivate={() => handleDeactivate(id)}
            />
          ))}
        </View>
      )}

      <PaywallModal
        visible={!!paywallProduct}
        productId={paywallProduct}
        headline={paywallProduct === 'pro_bundle' ? t('profile.paywallSubscriptionHeadline') : undefined}
        onClose={() => setPaywallProduct(null)}
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
  // 'form' = enter current/new password, 'code' = confirm with the emailed
  // verification code (see supabase.auth.reauthenticate() below) before the
  // change actually takes effect.
  const [pwStep, setPwStep] = useState<'form' | 'code'>('form')
  const [pwCode, setPwCode] = useState('')

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
    // Re-entering the current password proves it's really them - the
    // emailed code below is a second, independent factor on top of that,
    // not a replacement for it.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInError) { setPwLoading(false); setPwSucceeded(false); setPwStatus(t('profile.currentPasswordIncorrect')); return }
    const { error: reauthError } = await supabase.auth.reauthenticate()
    setPwLoading(false)
    if (reauthError) { setPwSucceeded(false); setPwStatus(reauthError.message); return }
    setPwSucceeded(true)
    setPwStatus(t('profile.verificationCodeSent'))
    setPwStep('code')
  }

  async function handleConfirmPasswordCode() {
    if (!pwCode.trim()) return
    setPwLoading(true)
    setPwStatus(null)
    const { error } = await supabase.auth.updateUser({ password: newPw, nonce: pwCode.trim() })
    setPwLoading(false)
    setPwSucceeded(!error)
    setPwStatus(error ? t('profile.verificationCodeInvalid') : t('profile.passwordUpdated'))
    if (!error) {
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwCode(''); setPwStep('form')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  async function handleResendPasswordCode() {
    setPwLoading(true)
    setPwStatus(null)
    const { error } = await supabase.auth.reauthenticate()
    setPwLoading(false)
    setPwSucceeded(!error)
    setPwStatus(error ? error.message : t('profile.verificationCodeSent'))
  }

  function handleCancelPasswordCode() {
    setPwStep('form')
    setPwCode('')
    setPwStatus(null)
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

        {pwStep === 'form' ? (
          <>
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
          </>
        ) : (
          <>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('profile.enterVerificationCode', { email })}</Text>
            <TextInput
              placeholder={t('profile.verificationCodePlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              value={pwCode}
              onChangeText={setPwCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8, letterSpacing: 4, textAlign: 'center' }]}
            />
            {pwStatus && (
              <Text style={{ fontSize: 11, color: pwSucceeded ? theme.colors.success : theme.colors.danger }}>{pwStatus}</Text>
            )}
            <Pressable
              onPress={handleConfirmPasswordCode}
              disabled={pwLoading || !pwCode.trim()}
              style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, opacity: pwLoading || !pwCode.trim() ? 0.4 : 1 }]}
            >
              {pwLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <Ionicons name="checkmark" size={14} color={theme.colors.textPrimary} />}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{t('profile.confirmCode')}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable onPress={handleCancelPasswordCode} disabled={pwLoading}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textTertiary }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={handleResendPasswordCode} disabled={pwLoading}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>{t('profile.resendCode')}</Text>
              </Pressable>
            </View>
          </>
        )}
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
  addOnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  addOnIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
