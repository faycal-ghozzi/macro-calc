import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { MacroBar } from '../components/MacroBar'
import { WeightLineChart } from '../components/WeightLineChart'
import { CalorieBarChart } from '../components/CalorieBarChart'
import { PaywallModal } from '../components/PaywallModal'
import { useTheme } from '../theme/ThemeProvider'
import { useWeightLog } from '../hooks/useWeightLog'
import { useReports } from '../hooks/useReports'
import { useProfile } from '../hooks/useProfile'
import { useEntitlements } from '../hooks/useEntitlements'
import { calculateMacroTargets } from '../lib/macroCalc'

type Tab = 'weekly' | 'monthly' | 'weight'

export default function ProgressScreen() {
  const theme = useTheme()
  const [tab, setTab] = useState<Tab>('weekly')
  const { entries, loading: wLoading, addEntry, deleteEntry, latestEntry, totalChange } = useWeightLog()
  const { weekly, monthly, loading: rLoading } = useReports()
  const { profile } = useProfile()
  const { flags } = useEntitlements()
  const [showReportsPaywall, setShowReportsPaywall] = useState(false)
  const targets = profile ? calculateMacroTargets(profile) : null

  const [weight, setWeight] = useState('')
  const [weightDate, setWeightDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [showWeightForm, setShowWeightForm] = useState(false)

  async function handleAddWeight() {
    const kg = Number.parseFloat(weight)
    if (!kg || kg < 20 || kg > 500) return
    setSavingWeight(true)
    await addEntry(kg, weightDate.toISOString().split('T')[0], weightNotes || undefined)
    setSavingWeight(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setWeight('')
    setWeightNotes('')
    setShowWeightForm(false)
  }

  const trendIcon = totalChange < -0.1 ? 'trending-down' : totalChange > 0.1 ? 'trending-up' : 'remove'
  const trendColor = totalChange < -0.1 ? theme.colors.success : totalChange > 0.1 ? theme.colors.danger : theme.colors.textTertiary

  const weightChartData = entries.map((e) => ({ date: e.logged_at.slice(5), weight: e.weight_kg }))
  const report = tab === 'weekly' ? weekly : monthly
  const calChartData = report?.days.map((d) => ({ date: d.date.slice(5), consumed: Math.round(d.calories), burned: Math.round(d.calories_burned) })) ?? []

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Progress</Text>
        {tab === 'weight' && (
          <Pressable onPress={() => { Haptics.selectionAsync(); setShowWeightForm((v) => !v) }} style={[styles.headerBtn, { backgroundColor: theme.colors.accentSoft }]}>
            <Ionicons name="add" size={14} color={theme.colors.accent} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>Log</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
        {(['weekly', 'monthly', 'weight'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              Haptics.selectionAsync()
              if (t === 'monthly' && !flags.hasMonthlyReports) { setShowReportsPaywall(true); return }
              setTab(t)
            }}
            style={[styles.tabButton, { borderRadius: theme.style.cardRadius - 10 }, tab === t && { backgroundColor: theme.colors.accent }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t ? theme.colors.onAccent : theme.colors.textSecondary }}>
              {t === 'weekly' ? '7 Days' : t === 'monthly' ? '30 Days' : 'Weight'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'weight' && (
        <View style={{ gap: 12 }}>
          {latestEntry && (
            <View style={styles.statsRow}>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{latestEntry.weight_kg}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Current (kg)</Text>
              </Card>
              <Card style={styles.statCell}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name={trendIcon as any} size={14} color={trendColor} />
                  <Text style={[styles.statValue, { color: trendColor }]}>{Math.abs(totalChange).toFixed(1)}</Text>
                </View>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Total Δ</Text>
              </Card>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{entries.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Entries</Text>
              </Card>
            </View>
          )}

          {showWeightForm && (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  placeholder="Weight (kg)"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
                />
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8, justifyContent: 'center' }]}
                >
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>{weightDate.toISOString().split('T')[0]}</Text>
                </Pressable>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={weightDate}
                  mode="date"
                  maximumDate={new Date()}
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) setWeightDate(d) }}
                />
              )}
              <TextInput
                placeholder="Notes (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                value={weightNotes}
                onChangeText={setWeightNotes}
                style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
              />
              <Pressable
                onPress={handleAddWeight}
                disabled={savingWeight || !weight}
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: savingWeight || !weight ? 0.5 : 1 }]}
              >
                {savingWeight ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Save</Text>
              </Pressable>
            </Card>
          )}

          {entries.length >= 2 && (
            <Card>
              <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Weight History</Text>
              <WeightLineChart data={weightChartData} />
            </Card>
          )}

          {wLoading ? (
            <LoadingState minHeight={120} />
          ) : entries.length === 0 ? (
            <EmptyState icon="trending-up-outline" title="No weight entries yet" subtitle="Tap Log to record your first weight" />
          ) : (
            <View style={{ gap: 8 }}>
              {[...entries].reverse().map((entry, i) => {
                const prev = entries[entries.length - 1 - i - 1]
                const diff = prev ? entry.weight_kg - prev.weight_kg : null
                return (
                  <Card key={entry.id} style={styles.entryRow}>
                    <View>
                      <Text style={[styles.entryWeight, { color: theme.colors.textPrimary }]}>{entry.weight_kg} kg</Text>
                      <Text style={[styles.entryMeta, { color: theme.colors.textTertiary }]}>
                        {entry.logged_at}{entry.notes ? ` · ${entry.notes}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {diff !== null && (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: diff < 0 ? theme.colors.success : diff > 0 ? theme.colors.danger : theme.colors.textTertiary }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </Text>
                      )}
                      <Pressable onPress={() => { Haptics.selectionAsync(); deleteEntry(entry.id) }}>
                        <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                  </Card>
                )
              })}
            </View>
          )}
        </View>
      )}

      {(tab === 'weekly' || tab === 'monthly') && (
        rLoading || !report ? (
          <LoadingState minHeight={200} />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.statsGrid}>
              <Card style={styles.gridCell}>
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>Avg daily calories</Text>
                <Text style={[styles.gridValue, { color: theme.colors.textPrimary }]}>{report.avg_calories}</Text>
                {targets && <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>target {targets.calories}</Text>}
              </Card>
              <Card style={styles.gridCell}>
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>Avg net calories</Text>
                <Text style={[styles.gridValue, { color: theme.colors.accent }]}>{report.avg_net_calories}</Text>
                <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>after exercise</Text>
              </Card>
              <Card style={styles.gridCell}>
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>Total burned</Text>
                <Text style={[styles.gridValue, { color: theme.colors.calories }]}>{report.total_burned} kcal</Text>
                <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>{report.active_days} active days</Text>
              </Card>
              <Card style={styles.gridCell}>
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>Avg protein</Text>
                <Text style={[styles.gridValue, { color: theme.colors.protein }]}>{report.avg_protein}g</Text>
                {targets && <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>target {targets.protein_g}g</Text>}
              </Card>
            </View>

            {calChartData.some((d) => d.consumed > 0) && (
              <Card>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Daily Calories</Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>Consumed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.calories }]} />
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>Burned</Text>
                  </View>
                </View>
                <CalorieBarChart data={calChartData} target={targets?.calories} />
              </Card>
            )}

            <Card style={{ gap: 12 }}>
              <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Avg Macros / day</Text>
              <MacroBar label="Protein" current={report.avg_protein} target={targets?.protein_g ?? (report.avg_protein || 1)} color={theme.colors.protein} />
              <MacroBar label="Carbs" current={report.avg_carbs} target={targets?.carbs_g ?? (report.avg_carbs || 1)} color={theme.colors.carbs} />
              <MacroBar label="Fat" current={report.avg_fat} target={targets?.fat_g ?? (report.avg_fat || 1)} color={theme.colors.fat} />
            </Card>

            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>Day by day</Text>
              {[...report.days].reverse().map((day) => (
                <Card key={day.date} style={{ opacity: day.calories === 0 ? 0.4 : 1 }}>
                  <View style={styles.dayRow}>
                    <Text style={[styles.dayDate, { color: theme.colors.textPrimary }]}>{day.date}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.colors.accent }}>{Math.round(day.calories)} in</Text>
                      {day.calories_burned > 0 && <Text style={{ fontSize: 12, color: theme.colors.calories }}>−{Math.round(day.calories_burned)} out</Text>}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>{Math.round(day.net_calories)} net</Text>
                    </View>
                  </View>
                  {day.calories > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: theme.colors.protein }}>P {Math.round(day.protein_g)}g</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.carbs }}>C {Math.round(day.carbs_g)}g</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.fat }}>F {Math.round(day.fat_g)}g</Text>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          </View>
        )
      )}

      <PaywallModal
        visible={showReportsPaywall}
        productId="advanced_reports"
        headline="Unlock monthly trends"
        onClose={() => setShowReportsPaywall(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '700' },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  tabBar: { flexDirection: 'row', padding: 4, gap: 4, marginBottom: 16 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  cardHeading: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryWeight: { fontSize: 14, fontWeight: '700' },
  entryMeta: { fontSize: 11, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: { flexBasis: '47%' },
  gridLabel: { fontSize: 11 },
  gridValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  gridSub: { fontSize: 10, marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', paddingHorizontal: 4 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 13, fontWeight: '600' },
})
