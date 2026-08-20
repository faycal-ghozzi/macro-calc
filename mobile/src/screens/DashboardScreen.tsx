import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { ProgressRing, RingLabel } from '../components/ProgressRing'
import { MacroBar } from '../components/MacroBar'
import { useTheme } from '../theme/ThemeProvider'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { useProfile } from '../hooks/useProfile'
import { calculateMacroTargets } from '../lib/macroCalc'
import type { TabParamList } from '../navigation/TabNavigator'
import type { MealType } from '../types'

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function displayDate(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (formatDate(date) === formatDate(today)) return 'Today'
  if (formatDate(date) === formatDate(yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
}

export default function DashboardScreen() {
  const theme = useTheme()
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>()
  const [date, setDate] = useState(new Date())
  const dateStr = formatDate(date)
  const { totals, byMeal, loading } = useFoodLog(dateStr)
  const { totalBurned } = useExerciseLog(dateStr)
  const { profile } = useProfile()
  const targets = profile ? calculateMacroTargets(profile) : null
  const isToday = formatDate(date) === formatDate(new Date())

  function changeDate(delta: number) {
    const next = new Date(date)
    next.setDate(date.getDate() + delta)
    if (next > new Date()) return
    Haptics.selectionAsync()
    setDate(next)
  }

  const netCalories = totals.calories - totalBurned
  const caloriesLeft = targets ? targets.calories - netCalories : null
  const caloriesProgress = targets ? netCalories / targets.calories : 0

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Text style={[styles.appTitle, { color: theme.colors.textPrimary }]}>MacroTrack</Text>
        <Pressable onPress={() => navigation.navigate('Profile')}>
          <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600' }}>
            {profile?.name || 'Set up profile'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.dateNav}>
        <Pressable onPress={() => changeDate(-1)} style={[styles.dateBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={[styles.dateLabel, { color: theme.colors.textPrimary }]}>{displayDate(date)}</Text>
        <Pressable
          onPress={() => changeDate(1)}
          disabled={isToday}
          style={[styles.dateBtn, { backgroundColor: theme.colors.backgroundElevated, opacity: isToday ? 0.3 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(400)}>
        <Card style={styles.heroCard}>
          <ProgressRing size={168} progress={caloriesProgress} color={theme.colors.calories} thickness={14}>
            <RingLabel value={Math.round(netCalories).toString()} label="net kcal" />
          </ProgressRing>

          <View style={styles.heroStats}>
            <View style={styles.heroStatRow}>
              <Text style={[styles.heroStatLabel, { color: theme.colors.textTertiary }]}>Eaten</Text>
              <Text style={[styles.heroStatValue, { color: theme.colors.textPrimary }]}>{Math.round(totals.calories)}</Text>
            </View>
            {totalBurned > 0 && (
              <View style={styles.heroStatRow}>
                <Text style={[styles.heroStatLabel, { color: theme.colors.textTertiary }]}>Burned</Text>
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
                  {caloriesLeft! >= 0 ? `${Math.round(caloriesLeft!)} left` : `${Math.abs(Math.round(caloriesLeft!))} over`}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>No target set</Text>
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
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{Math.round(totals.protein_g)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.miniRing}>
                <ProgressRing size={74} progress={totals.carbs_g / targets.carbs_g} color={theme.colors.carbs} thickness={7}>
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{Math.round(totals.carbs_g)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>Carbs</Text>
              </View>
              <View style={styles.miniRing}>
                <ProgressRing size={74} progress={totals.fat_g / targets.fat_g} color={theme.colors.fat} thickness={7}>
                  <Text style={[styles.miniRingValue, { color: theme.colors.textPrimary }]}>{Math.round(totals.fat_g)}</Text>
                </ProgressRing>
                <Text style={[styles.miniRingLabel, { color: theme.colors.textSecondary }]}>Fat</Text>
              </View>
            </View>
          </Card>

          <Card style={{ marginTop: 12, gap: 14 }}>
            <MacroBar label="Protein" current={totals.protein_g} target={targets.protein_g} color={theme.colors.protein} />
            <MacroBar label="Carbs" current={totals.carbs_g} target={targets.carbs_g} color={theme.colors.carbs} />
            <MacroBar label="Fat" current={totals.fat_g} target={targets.fat_g} color={theme.colors.fat} />
          </Card>
        </Animated.View>
      ) : (
        <Pressable onPress={() => navigation.navigate('Profile')}>
          <Card style={{ marginTop: 12, backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent + '40' }}>
            <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              Complete your profile to see macro targets →
            </Text>
          </Card>
        </Pressable>
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
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Text>
                    <Text style={[styles.mealCount, { color: theme.colors.textTertiary }]}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.mealRight}>
                  <Text style={[styles.mealCals, { color: theme.colors.accent }]}>{Math.round(mealCals)} kcal</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
            </Animated.View>
          )
        })}
      </View>

      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Log', { date: dateStr }) }}
        style={[styles.addButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
      >
        <Ionicons name="add" size={20} color={theme.colors.onAccent} />
        <Text style={[styles.addButtonText, { color: theme.colors.onAccent }]}>Add Food</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  appTitle: { fontSize: 20, fontWeight: '700' },
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
})
