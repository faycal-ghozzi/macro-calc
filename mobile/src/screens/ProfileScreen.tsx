import { useEffect, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { LoadingState } from '../components/LoadingState'
import { useTheme } from '../theme/ThemeProvider'
import { useProfile } from '../hooks/useProfile'
import { useUnitsStore } from '../store/useUnitsStore'
import { calculateMacroTargets, PROTEIN_PER_KG_RANGE, FAT_PER_KG_RANGE } from '../lib/macroCalc'
import { weightUnitLabel, kgToDisplayValue, displayValueToKg, cmToFtIn, ftInToCm, waterUnitLabel, mlToDisplayValue, displayValueToMl, formatMass } from '../lib/units'
import type { Profile as ProfileType } from '../types'
import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator'

const GOALS = [
  { value: 'lose', icon: 'trending-down', labelKey: 'profile.goalLoseWeightLabel', descKey: 'profile.goalLoseWeightDescription' },
  { value: 'maintain', icon: 'remove', labelKey: 'profile.goalMaintainLabel', descKey: 'profile.goalMaintainDescription' },
  { value: 'gain', icon: 'trending-up', labelKey: 'profile.goalGainWeightLabel', descKey: 'profile.goalGainWeightDescription' },
] as const

const ACTIVITY = [
  { value: 'sedentary', labelKey: 'profile.activitySedentaryLabel', descKey: 'profile.activitySedentaryDescription' },
  { value: 'light', labelKey: 'profile.activityLightLabel', descKey: 'profile.activityLightDescription' },
  { value: 'moderate', labelKey: 'profile.activityModerateLabel', descKey: 'profile.activityModerateDescription' },
  { value: 'active', labelKey: 'profile.activityActiveLabel', descKey: 'profile.activityActiveDescription' },
  { value: 'very_active', labelKey: 'profile.activityVeryActiveLabel', descKey: 'profile.activityVeryActiveDescription' },
] as const

export default function ProfileScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>()
  const { profile, loading, updateProfile } = useProfile()
  const { system } = useUnitsStore()
  const [form, setForm] = useState<Partial<ProfileType>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (profile) setForm(profile) }, [profile])

  function set<K extends keyof ProfileType>(key: K, value: ProfileType[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const weightUnit = weightUnitLabel(system)
  const waterUnit = waterUnitLabel(system)
  const heightFtIn = form.height_cm ? cmToFtIn(form.height_cm) : null

  function handleHeightFeetChange(v: string) {
    const feet = Number.parseInt(v, 10) || 0
    const inches = heightFtIn?.inches ?? 0
    const cm = Math.round(ftInToCm(feet, inches))
    set('height_cm', cm > 0 ? cm : (null as unknown as number))
  }

  function handleHeightInchesChange(v: string) {
    const inches = Number.parseInt(v, 10) || 0
    const feet = heightFtIn?.feet ?? 0
    const cm = Math.round(ftInToCm(feet, inches))
    set('height_cm', cm > 0 ? cm : (null as unknown as number))
  }

  function handleWeightChange(v: string) {
    const value = Number.parseFloat(v)
    if (!value) { set('current_weight_kg', null as unknown as number); return }
    set('current_weight_kg', displayValueToKg(value, system))
  }

  function handleWaterGoalChange(v: string) {
    const value = Number.parseFloat(v)
    set('water_goal_ml', value > 0 ? Math.round(displayValueToMl(value, system)) : 0)
  }

  function handleProteinPerKgChange(v: string) {
    const value = Number.parseFloat(v)
    set('protein_per_kg', value > 0 ? value : 0)
  }

  function handleFatPerKgChange(v: string) {
    const value = Number.parseFloat(v)
    set('fat_per_kg', value > 0 ? value : 0)
  }

  async function handleSave() {
    setSaving(true)
    // Only the fields this screen actually edits - form is seeded from the
    // full profile (see the sync effect above) so it also carries fields
    // this screen has no business touching (has_seen_first_login_tour,
    // seen_feature_tips, deletion_requested_at). Sending the whole blob
    // back would silently clobber those with whatever stale snapshot this
    // screen happened to capture at mount - e.g. resetting the tour flag
    // to false if this screen mounted before the tour's own completion
    // write landed (it always does, right after the tour's last step,
    // which drops the user here).
    await updateProfile({
      name: form.name,
      height_cm: form.height_cm,
      birth_year: form.birth_year,
      gender: form.gender,
      goal: form.goal,
      activity_level: form.activity_level,
      current_weight_kg: form.current_weight_kg,
      water_goal_ml: form.water_goal_ml,
      protein_per_kg: form.protein_per_kg,
      fat_per_kg: form.fat_per_kg,
    })
    setSaving(false)
    setSaved(true)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => setSaved(false), 2000)
  }

  const targets = profile ? calculateMacroTargets({ ...profile, ...form } as ProfileType) : null

  if (loading) {
    return (
      <Screen>
        <LoadingState minHeight={300} />
      </Screen>
    )
  }

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14 }}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={[styles.settingsBtn, { backgroundColor: theme.colors.backgroundElevated }]}
        >
          <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="person-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionPersonalInfo')}</Text>
        </View>
        <TextInput
          placeholder={t('profile.namePlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          value={form.name ?? ''}
          onChangeText={(v) => set('name', v)}
          style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.heightLabel', { unit: system === 'imperial' ? 'ft/in' : 'cm' })}</Text>
            {system === 'imperial' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="5"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={heightFtIn ? String(heightFtIn.feet) : ''}
                  onChangeText={handleHeightFeetChange}
                  keyboardType="number-pad"
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
                />
                <TextInput
                  placeholder="11"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={heightFtIn ? String(heightFtIn.inches) : ''}
                  onChangeText={handleHeightInchesChange}
                  keyboardType="number-pad"
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
                />
              </View>
            ) : (
              <TextInput
                placeholder={t('profile.heightPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                value={form.height_cm ? String(form.height_cm) : ''}
                onChangeText={(v) => set('height_cm', Number.parseFloat(v) || (null as unknown as number))}
                keyboardType="number-pad"
                style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
              />
            )}
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.birthYearLabel')}</Text>
            <TextInput
              placeholder={t('profile.birthYearPlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              value={form.birth_year ? String(form.birth_year) : ''}
              onChangeText={(v) => set('birth_year', Number.parseInt(v) || (null as unknown as number))}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
            />
          </View>
        </View>
        <View style={{ gap: 5 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.weightLabel', { unit: weightUnit })}</Text>
          <TextInput
            placeholder={t('profile.weightPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            value={form.current_weight_kg ? String(Math.round(kgToDisplayValue(form.current_weight_kg, system) * 10) / 10) : ''}
            onChangeText={handleWeightChange}
            keyboardType="decimal-pad"
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.genderLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { value: 'male', labelKey: 'profile.genderMale' },
              { value: 'female', labelKey: 'profile.genderFemale' },
              { value: 'other', labelKey: 'profile.genderOther' },
            ] as const).map((g) => (
              <Pressable
                key={g.value}
                onPress={() => { Haptics.selectionAsync(); set('gender', g.value) }}
                style={[
                  styles.chip,
                  { flex: 1, backgroundColor: form.gender === g.value ? theme.colors.accent : theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: form.gender === g.value ? theme.colors.onAccent : theme.colors.textSecondary }}>{t(g.labelKey)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="flag-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionGoal')}</Text>
        </View>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{t(g.labelKey)}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 1 }}>{t(g.descKey)}</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="walk-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionActivityLevel')}</Text>
        </View>
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary }}>{t(a.labelKey)}</Text>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t(a.descKey)}</Text>
          </Pressable>
        ))}
      </Card>

      {targets && (
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag" size={15} color={theme.colors.accent} />
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionDailyTargets')}</Text>
          </View>
          <View style={styles.targetsGrid}>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.calories }]}>{targets.calories}</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>{t('macros.calories')}</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.protein }]}>{formatMass(targets.protein_g, system)}</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>{t('macros.protein')}</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.carbs }]}>{formatMass(targets.carbs_g, system)}</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>{t('macros.carbs')}</Text>
            </View>
            <View style={[styles.targetCell, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Text style={[styles.targetValue, { color: theme.colors.fat }]}>{formatMass(targets.fat_g, system)}</Text>
              <Text style={[styles.targetLabel, { color: theme.colors.textTertiary }]}>{t('macros.fat')}</Text>
            </View>
          </View>
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="options-outline" size={15} color={theme.colors.accent} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionMacroRatios')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.proteinPerKgLabel')}</Text>
            <TextInput
              placeholder={String(PROTEIN_PER_KG_RANGE.default)}
              placeholderTextColor={theme.colors.textTertiary}
              value={form.protein_per_kg ? String(form.protein_per_kg) : ''}
              onChangeText={handleProteinPerKgChange}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
            />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.fatPerKgLabel')}</Text>
            <TextInput
              placeholder={String(FAT_PER_KG_RANGE.default)}
              placeholderTextColor={theme.colors.textTertiary}
              value={form.fat_per_kg ? String(form.fat_per_kg) : ''}
              onChangeText={handleFatPerKgChange}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
            />
          </View>
        </View>
        <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>
          {t('profile.macroRatiosHint', {
            proteinMin: PROTEIN_PER_KG_RANGE.min, proteinMax: PROTEIN_PER_KG_RANGE.max,
            fatMin: FAT_PER_KG_RANGE.min, fatMax: FAT_PER_KG_RANGE.max,
          })}
        </Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="water-outline" size={15} color={theme.colors.water} />
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('profile.sectionWaterGoal')}</Text>
        </View>
        <View style={{ gap: 5 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textTertiary }]}>{t('profile.waterGoalLabel', { unit: waterUnit })}</Text>
          <TextInput
            placeholder="2000"
            placeholderTextColor={theme.colors.textTertiary}
            value={form.water_goal_ml ? String(Math.round(mlToDisplayValue(form.water_goal_ml, system))) : ''}
            onChangeText={handleWaterGoalChange}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
        </View>
      </Card>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: saving ? 0.6 : 1 }]}
      >
        {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color={theme.colors.onAccent} />}
        <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>{saved ? t('profile.saved') : t('profile.saveProfile')}</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
})
