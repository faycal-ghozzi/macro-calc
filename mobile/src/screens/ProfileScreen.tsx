import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { ThemePicker } from '../components/ThemePicker'
import { useTheme } from '../theme/ThemeProvider'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { calculateMacroTargets } from '../lib/macroCalc'
import type { Profile as ProfileType } from '../types'

const GOALS = [
  { value: 'lose', label: 'Lose Weight', icon: 'trending-down', desc: '-500 kcal deficit' },
  { value: 'maintain', label: 'Maintain', icon: 'remove', desc: 'Stay at current weight' },
  { value: 'gain', label: 'Gain Weight', icon: 'trending-up', desc: '+300 kcal surplus' },
] as const

const ACTIVITY = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little/no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Hard training daily' },
] as const

export default function ProfileScreen() {
  const theme = useTheme()
  const { profile, loading, updateProfile } = useProfile()
  const { user, signOut } = useAuth()
  const [form, setForm] = useState<Partial<ProfileType>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (profile) setForm(profile) }, [profile])

  function set<K extends keyof ProfileType>(key: K, value: ProfileType[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateProfile(form)
    setSaving(false)
    setSaved(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => setSaved(false), 2000)
  }

  const targets = profile ? calculateMacroTargets({ ...profile, ...form } as ProfileType) : null

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 60 }} />
      </Screen>
    )
  }

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14 }}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Profile</Text>

      <Card style={{ gap: 12 }}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Personal Info</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={theme.colors.textTertiary}
          value={form.name ?? ''}
          onChangeText={(v) => set('name', v)}
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>Height (cm)</Text>
            <TextInput
              placeholder="175"
              placeholderTextColor={theme.colors.textTertiary}
              value={form.height_cm ? String(form.height_cm) : ''}
              onChangeText={(v) => set('height_cm', Number.parseFloat(v) || (null as unknown as number))}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
            />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>Birth Year</Text>
            <TextInput
              placeholder="1990"
              placeholderTextColor={theme.colors.textTertiary}
              value={form.birth_year ? String(form.birth_year) : ''}
              onChangeText={(v) => set('birth_year', Number.parseInt(v) || (null as unknown as number))}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
            />
          </View>
        </View>
        <View style={{ gap: 5 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>Current Weight (kg)</Text>
          <TextInput
            placeholder="75"
            placeholderTextColor={theme.colors.textTertiary}
            value={form.current_weight_kg ? String(form.current_weight_kg) : ''}
            onChangeText={(v) => set('current_weight_kg', Number.parseFloat(v) || (null as unknown as number))}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>Gender</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['male', 'female', 'other'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => { Haptics.selectionAsync(); set('gender', g) }}
                style={[
                  styles.chip,
                  { flex: 1, backgroundColor: form.gender === g ? theme.colors.accent : theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: form.gender === g ? theme.colors.onAccent : theme.colors.textSecondary, textTransform: 'capitalize' }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Goal</Text>
        {GOALS.map((g) => (
          <Pressable
            key={g.value}
            onPress={() => { Haptics.selectionAsync(); set('goal', g.value) }}
            style={[
              styles.optionRow,
              {
                backgroundColor: form.goal === g.value ? theme.colors.accentSoft : theme.colors.backgroundElevated,
                borderRadius: theme.style.cardRadius - 8,
                borderWidth: form.goal === g.value ? 1 : 0,
                borderColor: theme.colors.accent + '60',
              },
            ]}
          >
            <Ionicons name={g.icon as any} size={20} color={theme.colors.accent} />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{g.label}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }}>{g.desc}</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Activity Level</Text>
        {ACTIVITY.map((a) => (
          <Pressable
            key={a.value}
            onPress={() => { Haptics.selectionAsync(); set('activity_level', a.value) }}
            style={[
              styles.activityRow,
              {
                backgroundColor: form.activity_level === a.value ? theme.colors.accentSoft : theme.colors.backgroundElevated,
                borderRadius: theme.style.cardRadius - 8,
                borderWidth: form.activity_level === a.value ? 1 : 0,
                borderColor: theme.colors.accent + '60',
              },
            ]}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{a.label}</Text>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{a.desc}</Text>
          </Pressable>
        ))}
      </Card>

      {targets && (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag" size={15} color={theme.colors.accent} />
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Your Daily Targets</Text>
          </View>
          <View style={styles.targetsGrid}>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.calories }]}>{targets.calories}</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>Calories</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.protein }]}>{targets.protein_g}g</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>Protein</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.carbs }]}>{targets.carbs_g}g</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>Carbs</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.fat }]}>{targets.fat_g}g</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>Fat</Text>
            </View>
          </View>
        </Card>
      )}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: saving ? 0.6 : 1 }]}
      >
        {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color={theme.colors.onAccent} />}
        <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>{saved ? 'Saved!' : 'Save Profile'}</Text>
      </Pressable>

      <Card style={{ gap: 10 }}>
        <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Appearance</Text>
        <ThemePicker />
      </Card>

      <SecuritySection
        email={user?.email ?? ''}
        onSignOut={signOut}
        onRequestDeletion={() => updateProfile({ deletion_requested_at: new Date().toISOString() }).then(signOut)}
      />
    </Screen>
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
  const [newEmail, setNewEmail] = useState('')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [pwStatus, setPwStatus] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleEmailUpdate() {
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailStatus(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailLoading(false)
    setEmailStatus(error ? error.message : 'Confirmation sent to new email address.')
    if (!error) { setNewEmail(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
  }

  async function handlePasswordUpdate() {
    if (newPw !== confirmPw) { setPwStatus('Passwords do not match.'); return }
    if (newPw.length < 8) { setPwStatus('Password must be at least 8 characters.'); return }
    setPwLoading(true)
    setPwStatus(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw })
    if (signInError) { setPwLoading(false); setPwStatus('Current password is incorrect.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    setPwStatus(error ? error.message : 'Password updated successfully.')
    if (!error) { setCurrentPw(''); setNewPw(''); setConfirmPw(''); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }
  }

  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="mail-outline" size={15} color={theme.colors.textTertiary} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Update Email</Text>
        </View>
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>Current: {email}</Text>
        <TextInput
          placeholder="New email address"
          placeholderTextColor={theme.colors.textTertiary}
          value={newEmail}
          onChangeText={setNewEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        {emailStatus && (
          <Text style={{ fontSize: 11, color: emailStatus.includes('sent') ? theme.colors.success : theme.colors.danger }}>{emailStatus}</Text>
        )}
        <Pressable
          onPress={handleEmailUpdate}
          disabled={emailLoading || !newEmail.trim()}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, opacity: emailLoading || !newEmail.trim() ? 0.4 : 1 }]}
        >
          {emailLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <Ionicons name="checkmark" size={14} color={theme.colors.textPrimary} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>Update Email</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="lock-closed-outline" size={15} color={theme.colors.textTertiary} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Change Password</Text>
        </View>
        <TextInput
          placeholder="Current password"
          placeholderTextColor={theme.colors.textTertiary}
          value={currentPw}
          onChangeText={setCurrentPw}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <TextInput
          placeholder="New password (8+ chars)"
          placeholderTextColor={theme.colors.textTertiary}
          value={newPw}
          onChangeText={setNewPw}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <TextInput
          placeholder="Confirm new password"
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
          <Text style={{ fontSize: 11, color: pwStatus.includes('successfully') ? theme.colors.success : theme.colors.danger }}>{pwStatus}</Text>
        )}
        <Pressable
          onPress={handlePasswordUpdate}
          disabled={pwLoading || !currentPw || !newPw || newPw !== confirmPw}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, opacity: pwLoading || !currentPw || !newPw || newPw !== confirmPw ? 0.4 : 1 }]}
        >
          {pwLoading ? <ActivityIndicator size="small" color={theme.colors.textPrimary} /> : <Ionicons name="checkmark" size={14} color={theme.colors.textPrimary} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>Update Password</Text>
        </Pressable>
      </Card>

      <Card>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onSignOut() }} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={17} color={theme.colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.danger }}>Sign Out</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 10, borderWidth: 1, borderColor: theme.colors.danger + '33' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="warning-outline" size={15} color={theme.colors.danger} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Danger Zone</Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            Alert.alert(
              'Delete account?',
              'This permanently deletes your account and all your data (food logs, weight history, meals, exercise logs) after a 30-day grace period. You can cancel any time before then by logging back in. After 30 days this cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Account', style: 'destructive', onPress: onRequestDeletion },
              ]
            )
          }}
          style={[styles.secondaryButton, { backgroundColor: theme.colors.danger + '1A', borderRadius: theme.style.cardRadius - 8 }]}
        >
          <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.danger }}>Delete Account</Text>
        </Pressable>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  chip: { paddingVertical: 11, alignItems: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  targetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetCell: { flexBasis: '47%', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  targetValue: { fontSize: 18, fontWeight: '700' },
  targetLabel: { fontSize: 11, marginTop: 2 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
})
