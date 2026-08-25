import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { AnimatedPressable } from '../components/AnimatedPressable'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { ProgressRing, RingLabel } from '../components/ProgressRing'
import { MacroBar } from '../components/MacroBar'
import { LogWeightModal } from '../components/LogWeightModal'
import { useTheme } from '../theme/ThemeProvider'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { useWaterLog } from '../hooks/useWaterLog'
import { useProfile } from '../hooks/useProfile'
import { useUnitsStore } from '../store/useUnitsStore'
import { useTour, TourTarget, EMPTY_SEEN_TIPS } from '../contexts/TourContext'
import { calculateMacroTargets } from '../lib/macroCalc'
import { mirrorChevron, rtlFlipStyle } from '../lib/rtl'
import { waterUnitLabel, mlToDisplayValue, displayValueToMl, massUnitLabel, gToDisplayValue } from '../lib/units'
import { MEAL_TYPES, MEAL_ICONS, MEAL_TYPE_LABEL_KEYS } from '../lib/mealTypes'
import type { TabParamList } from '../navigation/TabNavigator'

const WATER_QUICK_ADD: Record<'metric' | 'imperial', number[]> = {
  metric: [250, 500],
  imperial: [8, 16],
}

const DEFAULT_WATER_GOAL_ML = 2000

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function DashboardScreen() {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>()
  const [date, setDate] = useState(new Date())
  const dateStr = formatDate(date)

  function displayDate(d: Date) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (formatDate(d) === formatDate(today)) return t('common.today')
    if (formatDate(d) === formatDate(yesterday)) return t('dashboard.yesterday')
    return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
  }
  const { totals, byMeal, loading } = useFoodLog(dateStr)
  const { totalBurned } = useExerciseLog(dateStr)
  const { totalMl: waterMl, addWaterLog, deleteWaterLog, logs: waterLogs } = useWaterLog(dateStr)
  const { profile } = useProfile()
  const { system } = useUnitsStore()
  const targets = profile ? calculateMacroTargets(profile) : null
  const isToday = formatDate(date) === formatDate(new Date())
  const { showTip } = useTour()
  const seenFeatureTips = profile?.seen_feature_tips ?? EMPTY_SEEN_TIPS
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [addingWater, setAddingWater] = useState(false)

  const weightTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_weight_log || weightTipAttempted.current) return
    weightTipAttempted.current = true
    showTip('tip_weight_log', { title: t('tour.tipWeightLogTitle'), body: t('tour.tipWeightLogBody') })
  }, [seenFeatureTips, showTip, t])

  const settingsTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_settings || settingsTipAttempted.current) return
    settingsTipAttempted.current = true
    showTip('tip_settings', { title: t('tour.tipSettingsTitle'), body: t('tour.tipSettingsBody') })
  }, [seenFeatureTips, showTip, t])

  function handleSettingsPress() {
    Haptics.selectionAsync()
    navigation.navigate('Profile', { screen: 'Settings' })
  }

  function changeDate(delta: number) {
    const next = new Date(date)
    next.setDate(date.getDate() + delta)
    if (next > new Date()) return
    Haptics.selectionAsync()
    setDate(next)
  }

  async function handleQuickAddWater(displayAmount: number) {
    Haptics.selectionAsync()
    setAddingWater(true)
    const { error } = await addWaterLog(displayValueToMl(displayAmount, system))
    setAddingWater(false)
    if (error) Alert.alert(t('dashboard.waterErrorTitle'), error.message)
  }

  async function handleUndoWater() {
    if (waterLogs.length === 0) return
    Haptics.selectionAsync()
    const { error } = await deleteWaterLog(waterLogs[waterLogs.length - 1].id)
    if (error) Alert.alert(t('dashboard.waterErrorTitle'), error.message)
  }

  const netCalories = totals.calories - totalBurned
  const caloriesLeft = targets ? targets.calories - netCalories : null
  const caloriesProgress = targets ? netCalories / targets.calories : 0
  const waterUnit = waterUnitLabel(system)
  const waterGoalMl = profile?.water_goal_ml ?? DEFAULT_WATER_GOAL_ML
  const massUnit = massUnitLabel(system)
  const massDecimals = system === 'imperial' ? 1 : 0
  const waterDisplay = mlToDisplayValue(waterMl, system)
  const waterGoalDisplay = mlToDisplayValue(waterGoalMl, system)
  const quickAddAmounts = WATER_QUICK_ADD[system]

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <TourTarget id="tip_settings">
          <Pressable
            onPress={handleSettingsPress}
            style={[styles.iconBtn, { backgroundColor: theme.colors.backgroundElevated }]}
          >
            <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        </TourTarget>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TourTarget id="tip_weight_log">
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setShowWeightModal(true) }}
              style={[styles.logWeightBtn, { backgroundColor: theme.colors.backgroundElevated }]}
            >
              <Ionicons name="fitness-outline" size={13} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>{t('dashboard.logWeight')}</Text>
            </Pressable>
          </TourTarget>
          <Pressable onPress={() => navigation.navigate('Profile')}>
            <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600' }}>
              {profile?.name || t('dashboard.setUpProfile')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.dateNav}>
        <Pressable onPress={() => changeDate(-1)} style={[styles.dateBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
          <Ionicons name={mirrorChevron('chevron-back')} size={18} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={[styles.dateLabel, { color: theme.colors.textPrimary }]}>{displayDate(date)}</Text>
        <Pressable
          onPress={() => changeDate(1)}
          disabled={isToday}
          style={[styles.dateBtn, { backgroundColor: theme.colors.backgroundElevated, opacity: isToday ? 0.3 : 1 }]}
        >
          <Ionicons name={mirrorChevron('chevron-forward')} size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingState minHeight={300} />
      ) : (
      <>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card
          style={{
            ...styles.heroCard,
            borderColor: theme.colors.accent + '30',
            shadowColor: theme.colors.calories,
            shadowOpacity: theme.style.shadowOpacity,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          <ProgressRing size={168} progress={caloriesProgress} color={theme.colors.calories} thickness={14}>
            <RingLabel value={Math.round(netCalories).toString()} label={t('dashboard.netKcal')} />
          </ProgressRing>

          <View style={styles.heroStats}>
            <View style={styles.heroStatRow}>
              <Text style={[styles.heroStatLabel, { color: theme.colors.textTertiary }]}>{t('dashboard.eaten')}</Text>
              <Text style={[styles.heroStatValue, { color: theme.colors.textPrimary }]}>{Math.round(totals.calories)}</Text>
            </View>
            {totalBurned > 0 && (
              <View style={styles.heroStatRow}>
                <Text style={[styles.heroStatLabel, { color: theme.colors.textTertiary }]}>{t('dashboard.burned')}</Text>
                <Text style={[styles.heroStatValue, { color: theme.colors.calories }]}>−{Math.round(totalBurned)}</Text>
              </View>
            )}
            {targets ? (
              <View style={[styles.pill, { backgroundColor: caloriesLeft! >= 0 ? theme.colors.accentSoft : theme.colors.danger + '22' }]}>
                <Ionicons
                  name={caloriesLeft! >= 0 ? 'flag' : 'flame'}
                  size={11}
                  color={caloriesLeft! >= 0 ? theme.colors.accent : theme.colors.danger}
                />
                <Text style={{ fontSize: 11, fontWeight: '600', color: caloriesLeft! >= 0 ? theme.colors.accent : theme.colors.danger }}>
                  {caloriesLeft! >= 0
                    ? t('dashboard.caloriesLeft', { count: Math.round(caloriesLeft!) })
                    : t('dashboard.caloriesOver', { count: Math.abs(Math.round(caloriesLeft!)) })}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('dashboard.noTargetSet')}</Text>
            )}
          </View>
        </Card>
      </Animated.View>

      {targets ? (
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Card style={{ marginTop: 12 }}>
            <View style={styles.ringsRow}>
              <View style={styles.miniRing}>
                <ProgressRing size={74} progress={totals.protein_g / targets.protein_g} color={theme.colors.protein} thickness={7}>
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{gToDisplayValue(totals.protein_g, system).toFixed(massDecimals)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>{t('macros.protein')}</Text>
              </View>
              <View style={styles.miniRing}>
                <ProgressRing size={74} progress={totals.carbs_g / targets.carbs_g} color={theme.colors.carbs} thickness={7}>
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{gToDisplayValue(totals.carbs_g, system).toFixed(massDecimals)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>{t('macros.carbs')}</Text>
              </View>
              <View style={styles.miniRing}>
                <ProgressRing size={74} progress={totals.fat_g / targets.fat_g} color={theme.colors.fat} thickness={7}>
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{gToDisplayValue(totals.fat_g, system).toFixed(massDecimals)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>{t('macros.fat')}</Text>
              </View>
            </View>
          </Card>

          <Card style={{ marginTop: 12, gap: 14 }}>
            <MacroBar label={t('macros.protein')} current={gToDisplayValue(totals.protein_g, system)} target={gToDisplayValue(targets.protein_g, system)} color={theme.colors.protein} unit={massUnit} decimals={massDecimals} />
            <MacroBar label={t('macros.carbs')} current={gToDisplayValue(totals.carbs_g, system)} target={gToDisplayValue(targets.carbs_g, system)} color={theme.colors.carbs} unit={massUnit} decimals={massDecimals} />
            <MacroBar label={t('macros.fat')} current={gToDisplayValue(totals.fat_g, system)} target={gToDisplayValue(targets.fat_g, system)} color={theme.colors.fat} unit={massUnit} decimals={massDecimals} />
          </Card>
        </Animated.View>
      ) : (
        <Pressable onPress={() => navigation.navigate('Profile')}>
          <Card style={{ marginTop: 12, backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent + '40' }}>
            <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              {t('dashboard.completeProfile')}
            </Text>
          </Card>
        </Pressable>
      )}

      <Animated.View entering={FadeInDown.duration(400).delay(120)}>
        <Card style={{ marginTop: 12, gap: 12 }}>
          <MacroBar label={t('dashboard.water')} current={waterDisplay} target={waterGoalDisplay} color={theme.colors.water} unit={` ${waterUnit}`} />
          <View style={styles.waterActions}>
            {quickAddAmounts.map((amount) => (
              <Pressable
                key={amount}
                onPress={() => handleQuickAddWater(amount)}
                disabled={addingWater}
                style={[styles.waterPill, { backgroundColor: theme.colors.water + '1A' }]}
              >
                <Ionicons name="add" size={12} color={theme.colors.water} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.water }}>{amount} {waterUnit}</Text>
              </Pressable>
            ))}
            {addingWater && <ActivityIndicator size="small" color={theme.colors.water} />}
            {waterLogs.length > 0 && !addingWater && (
              <Pressable onPress={handleUndoWater} style={styles.waterUndoBtn}>
                <Ionicons name="arrow-undo-outline" size={14} color={theme.colors.textTertiary} style={rtlFlipStyle()} />
              </Pressable>
            )}
          </View>
        </Card>
      </Animated.View>

      {totals.calories === 0 && (
        <View style={{ marginTop: 12 }}>
          <EmptyState icon="restaurant-outline" title={t('dashboard.emptyTitle')} subtitle={t('dashboard.emptySubtitle')} />
        </View>
      )}

      <View style={{ marginTop: 16, gap: 8 }}>
        {MEAL_TYPES.map((meal, i) => {
          const items = byMeal(meal)
          const mealCals = items.reduce((s, it) => s + it.calories, 0)
          return (
            <Animated.View key={meal} entering={FadeInDown.duration(350).delay(120 + i * 40)}>
              <Card
                onPress={() => navigation.navigate('Log', { meal, date: dateStr })}
                style={styles.mealRow}
              >
                <View style={styles.mealLeft}>
                  <View style={[styles.mealIcon, { backgroundColor: theme.colors.accentSoft }]}>
                    <Ionicons name={MEAL_ICONS[meal]} size={16} color={theme.colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.mealName, { color: theme.colors.textPrimary }]}>
                      {t(MEAL_TYPE_LABEL_KEYS[meal])}
                    </Text>
                    <Text style={[styles.mealCount, { color: theme.colors.textTertiary }]}>
                      {t('dashboard.itemCount', { count: items.length })}
                    </Text>
                  </View>
                </View>
                <View style={styles.mealRight}>
                  <Text style={[styles.mealCals, { color: theme.colors.accent }]}>{Math.round(mealCals)} {t('common.kcal')}</Text>
                  <Ionicons name={mirrorChevron('chevron-forward')} size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
            </Animated.View>
          )
        })}
      </View>
      </>
      )}

      {!loading && (
        <AnimatedPressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Log', { date: dateStr }) }}
          style={[styles.addButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
        >
          <Ionicons name="add" size={20} color={theme.colors.onAccent} />
          <Text style={[styles.addButtonText, { color: theme.colors.onAccent }]}>{t('dashboard.addFood')}</Text>
        </AnimatedPressable>
      )}

      <LogWeightModal visible={showWeightModal} onClose={() => setShowWeightModal(false)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 },
  dateBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateLabel: { fontSize: 15, fontWeight: '700', minWidth: 90, textAlign: 'center' },
  heroCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroStats: { alignItems: 'flex-end', gap: 8 },
  heroStatRow: { alignItems: 'flex-end' },
  heroStatLabel: { fontSize: 11, fontWeight: '600' },
  heroStatValue: { fontSize: 18, fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  miniRing: { alignItems: 'center', gap: 6 },
  miniRingValue: { fontSize: 14, fontWeight: '700' },
  miniRingLabel: { fontSize: 11, fontWeight: '600' },
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 14, fontWeight: '600' },
  mealCount: { fontSize: 11, marginTop: 1 },
  mealRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealCals: { fontSize: 13, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 18 },
  addButtonText: { fontSize: 15, fontWeight: '700' },
  logWeightBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  waterActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  waterUndoBtn: { padding: 4, marginStart: 'auto' },
})
