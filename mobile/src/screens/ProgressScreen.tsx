import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { MacroBar } from '../components/MacroBar'
import { WeightLineChart } from '../components/WeightLineChart'
import { CalorieBarChart } from '../components/CalorieBarChart'
import { PaywallModal } from '../components/PaywallModal'
import { AnimatedPressable } from '../components/AnimatedPressable'
import { MetricDetailModal } from '../components/MetricDetailModal'
import { useTheme } from '../theme/ThemeProvider'
import { useWeightLog } from '../hooks/useWeightLog'
import { useReports, DayReport } from '../hooks/useReports'
import { useProfile } from '../hooks/useProfile'
import { useEntitlements } from '../hooks/useEntitlements'
import { useUnitsStore } from '../store/useUnitsStore'
import { calculateMacroTargets } from '../lib/macroCalc'
import { weightUnitLabel, kgToDisplayValue, displayValueToKg, weightBounds, formatWeightDelta, formatMass, gToDisplayValue, massUnitLabel } from '../lib/units'
import { exportNutritionReport, exportWeightReport } from '../lib/pdfReport'
import { ChartPoint } from '../lib/chartUtils'

type Tab = 'days' | 'allTime' | 'weight'

interface DetailConfig {
  title: string
  color: string
  points: ChartPoint[]
  formatValue: (n: number) => string
  targetValue?: number
}

const DAY_OPTIONS = [3, 5, 7, 14, 30]
const FREE_MAX_DAYS = 7

export default function ProgressScreen() {
  const theme = useTheme()
  const { t, i18n } = useTranslation()
  const { system } = useUnitsStore()
  const weightUnit = weightUnitLabel(system)
  const [tab, setTab] = useState<Tab>('days')
  const [selectedDays, setSelectedDays] = useState(FREE_MAX_DAYS)
  const { entries, loading: wLoading, addEntry, deleteEntry, latestEntry, totalChange } = useWeightLog()
  const { getDays, allTime, loading: rLoading } = useReports()
  const { profile } = useProfile()
  const { flags } = useEntitlements()
  const [showReportsPaywall, setShowReportsPaywall] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [detail, setDetail] = useState<DetailConfig | null>(null)
  const targets = profile ? calculateMacroTargets(profile) : null

  const [weight, setWeight] = useState('')
  const [weightDate, setWeightDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [showWeightForm, setShowWeightForm] = useState(false)

  async function handleAddWeight() {
    const value = Number.parseFloat(weight)
    const { min, max } = weightBounds(system)
    if (!value || value < min || value > max) return
    const kg = displayValueToKg(value, system)
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
  const report = tab === 'days' ? getDays(selectedDays) : tab === 'allTime' ? allTime : null
  const calChartData = tab === 'days' && report
    ? report.days.map((d) => ({ date: d.date.slice(5), consumed: Math.round(d.calories), burned: Math.round(d.calories_burned) }))
    : []

  function handleSelectDays(n: number) {
    Haptics.selectionAsync()
    if (n > FREE_MAX_DAYS && !flags.hasMonthlyReports) { setShowReportsPaywall(true); return }
    setSelectedDays(n)
  }

  function openDetail(config: DetailConfig) {
    Haptics.selectionAsync()
    setDetail(config)
  }

  function pointsFor(key: keyof DayReport): ChartPoint[] {
    return report ? report.days.map((d) => ({ date: d.date, value: d[key] as number })) : []
  }

  async function handleExport() {
    if (exporting) return
    Haptics.selectionAsync()
    setExporting(true)
    try {
      if (tab === 'weight') {
        await exportWeightReport({ t, language: i18n.language, system, entries, accentColor: theme.colors.accent })
      } else if (report) {
        const rangeLabel = tab === 'days' ? t('progress.daysChip', { count: selectedDays }) : t('progress.sinceDate', { date: report.days[0]?.date ?? '' })
        await exportNutritionReport({
          t,
          language: i18n.language,
          system,
          rangeLabel,
          report,
          targets: targets ? { calories: targets.calories, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g } : null,
          colors: { accent: theme.colors.accent, calories: theme.colors.calories, protein: theme.colors.protein, carbs: theme.colors.carbs, fat: theme.colors.fat },
        })
      }
    } catch {
      Alert.alert(t('progress.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={[styles.headerBtn, { backgroundColor: theme.colors.backgroundElevated, opacity: exporting ? 0.6 : 1 }]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
          ) : (
            <Ionicons name="share-outline" size={14} color={theme.colors.textSecondary} />
          )}
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>{t('progress.export')}</Text>
        </Pressable>
        {tab === 'weight' && (
          <Pressable onPress={() => { Haptics.selectionAsync(); setShowWeightForm((v) => !v) }} style={[styles.headerBtn, { backgroundColor: theme.colors.accentSoft }]}>
            <Ionicons name="add" size={14} color={theme.colors.accent} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>{t('progress.log')}</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
        {(['days', 'allTime', 'weight'] as Tab[]).map((tabKey) => (
          <Pressable
            key={tabKey}
            onPress={() => {
              Haptics.selectionAsync()
              if (tabKey === 'allTime' && !flags.hasMonthlyReports) { setShowReportsPaywall(true); return }
              setTab(tabKey)
            }}
            style={[styles.tabButton, { borderRadius: theme.style.cardRadius - 10 }, tab === tabKey && { backgroundColor: theme.colors.accent }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: tab === tabKey ? theme.colors.onAccent : theme.colors.textSecondary }}>
              {tabKey === 'days' ? t('progress.tabDays') : tabKey === 'allTime' ? t('progress.tabAllTime') : t('progress.tabWeight')}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'days' && (
        <View style={[styles.dayRangeRow, { borderBottomColor: theme.colors.divider }]}>
          {DAY_OPTIONS.map((n) => {
            const active = selectedDays === n
            return (
              <Pressable key={n} onPress={() => handleSelectDays(n)} style={styles.dayRangeItem}>
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? theme.colors.accent : theme.colors.textTertiary }}>
                  {t('progress.daysChip', { count: n })}
                </Text>
                <View style={[styles.dayRangeIndicator, { backgroundColor: active ? theme.colors.accent : 'transparent' }]} />
              </Pressable>
            )
          })}
        </View>
      )}

      {tab === 'weight' && (
        <View style={{ gap: 12 }}>
          {latestEntry && (
            <View style={styles.statsRow}>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{Math.round(kgToDisplayValue(latestEntry.weight_kg, system) * 10) / 10}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.statCurrent', { unit: weightUnit })}</Text>
              </Card>
              <Card style={styles.statCell}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name={trendIcon as any} size={14} color={trendColor} />
                  <Text style={[styles.statValue, { color: trendColor }]}>{Math.abs(kgToDisplayValue(totalChange, system)).toFixed(1)}</Text>
                </View>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.statTotalDelta')}</Text>
              </Card>
              <Card style={styles.statCell}>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{entries.length}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{t('progress.statEntries')}</Text>
              </Card>
            </View>
          )}

          {showWeightForm && (
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  placeholder={t('progress.weightPlaceholder', { unit: weightUnit })}
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
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>{weightDate.toLocaleDateString(i18n.language)}</Text>
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
                placeholder={t('progress.notesPlaceholder')}
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
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('progress.save')}</Text>
              </Pressable>
            </Card>
          )}

          {entries.length >= 2 && (
            <Card>
              <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>{t('progress.weightHistory')}</Text>
              <WeightLineChart data={weightChartData} />
            </Card>
          )}

          {wLoading ? (
            <LoadingState minHeight={120} />
          ) : entries.length === 0 ? (
            <EmptyState icon="trending-up-outline" title={t('progress.emptyTitle')} subtitle={t('progress.emptySubtitle')} />
          ) : (
            <View style={{ gap: 8 }}>
              {[...entries].reverse().map((entry, i) => {
                const prev = entries[entries.length - 1 - i - 1]
                const diff = prev ? entry.weight_kg - prev.weight_kg : null
                return (
                  <Card key={entry.id} style={styles.entryRow}>
                    <View>
                      <Text style={[styles.entryWeight, { color: theme.colors.textPrimary }]}>{Math.round(kgToDisplayValue(entry.weight_kg, system) * 10) / 10} {weightUnit}</Text>
                      <Text style={[styles.entryMeta, { color: theme.colors.textTertiary }]}>
                        {entry.logged_at}{entry.notes ? ` · ${entry.notes}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {diff !== null && (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: diff < 0 ? theme.colors.success : diff > 0 ? theme.colors.danger : theme.colors.textTertiary }}>
                          {formatWeightDelta(diff, system)}
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

      {(tab === 'days' || tab === 'allTime') && (
        rLoading || !report ? (
          <LoadingState minHeight={200} />
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.statsGrid}>
              <Card
                style={styles.gridCell}
                onPress={() => openDetail({
                  title: t('progress.avgDailyCalories'),
                  color: theme.colors.accent,
                  points: pointsFor('calories'),
                  formatValue: (n) => `${Math.round(n)} ${t('common.kcal')}`,
                  targetValue: targets?.calories,
                })}
              >
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>{t('progress.avgDailyCalories')}</Text>
                <Text style={[styles.gridValue, { color: theme.colors.textPrimary }]}>{report.avg_calories}</Text>
                {targets && <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>{t('progress.targetSuffix', { value: targets.calories })}</Text>}
              </Card>
              <Card
                style={styles.gridCell}
                onPress={() => openDetail({
                  title: t('progress.avgNetCalories'),
                  color: theme.colors.accent,
                  points: pointsFor('net_calories'),
                  formatValue: (n) => `${Math.round(n)} ${t('common.kcal')}`,
                })}
              >
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>{t('progress.avgNetCalories')}</Text>
                <Text style={[styles.gridValue, { color: theme.colors.accent }]}>{report.avg_net_calories}</Text>
                <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>{t('progress.afterExercise')}</Text>
              </Card>
              <Card
                style={styles.gridCell}
                onPress={() => openDetail({
                  title: t('progress.totalBurned'),
                  color: theme.colors.calories,
                  points: pointsFor('calories_burned'),
                  formatValue: (n) => `${Math.round(n)} ${t('common.kcal')}`,
                })}
              >
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>{t('progress.totalBurned')}</Text>
                <Text style={[styles.gridValue, { color: theme.colors.calories }]}>{report.total_burned} {t('common.kcal')}</Text>
                <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>{t('progress.activeDays', { count: report.active_days })}</Text>
              </Card>
              <Card
                style={styles.gridCell}
                onPress={() => openDetail({
                  title: t('progress.avgProtein'),
                  color: theme.colors.protein,
                  points: pointsFor('protein_g'),
                  formatValue: (n) => formatMass(n, system),
                  targetValue: targets?.protein_g,
                })}
              >
                <Text style={[styles.gridLabel, { color: theme.colors.textTertiary }]}>{t('progress.avgProtein')}</Text>
                <Text style={[styles.gridValue, { color: theme.colors.protein }]}>{formatMass(report.avg_protein, system)}</Text>
                {targets && <Text style={[styles.gridSub, { color: theme.colors.textTertiary }]}>{t('progress.targetSuffix', { value: formatMass(targets.protein_g, system) })}</Text>}
              </Card>
            </View>

            {tab === 'allTime' && report.days.length > 0 && (
              <Card style={{ gap: 4 }}>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary, marginBottom: 0 }]}>
                  {t('progress.sinceDate', { date: report.days[0].date })}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{t('progress.activeDays', { count: report.active_days })}</Text>
              </Card>
            )}

            {tab === 'days' && calChartData.some((d) => d.consumed > 0) && (
              <Card>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>{t('progress.dailyCalories')}</Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('progress.consumed')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.calories }]} />
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('progress.burned')}</Text>
                  </View>
                </View>
                <CalorieBarChart data={calChartData} target={targets?.calories} />
              </Card>
            )}

            <Card style={{ gap: 12 }}>
              <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>{t('progress.avgMacrosPerDay')}</Text>
              <AnimatedPressable
                scaleTo={0.98}
                onPress={() => openDetail({
                  title: t('macros.protein'),
                  color: theme.colors.protein,
                  points: pointsFor('protein_g'),
                  formatValue: (n) => formatMass(n, system),
                  targetValue: targets?.protein_g,
                })}
              >
                <MacroBar
                  label={t('macros.protein')}
                  current={gToDisplayValue(report.avg_protein, system)}
                  target={gToDisplayValue(targets?.protein_g ?? (report.avg_protein || 1), system)}
                  color={theme.colors.protein}
                  unit={massUnitLabel(system)}
                  decimals={system === 'imperial' ? 1 : 0}
                />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                onPress={() => openDetail({
                  title: t('macros.carbs'),
                  color: theme.colors.carbs,
                  points: pointsFor('carbs_g'),
                  formatValue: (n) => formatMass(n, system),
                  targetValue: targets?.carbs_g,
                })}
              >
                <MacroBar
                  label={t('macros.carbs')}
                  current={gToDisplayValue(report.avg_carbs, system)}
                  target={gToDisplayValue(targets?.carbs_g ?? (report.avg_carbs || 1), system)}
                  color={theme.colors.carbs}
                  unit={massUnitLabel(system)}
                  decimals={system === 'imperial' ? 1 : 0}
                />
              </AnimatedPressable>
              <AnimatedPressable
                scaleTo={0.98}
                onPress={() => openDetail({
                  title: t('macros.fat'),
                  color: theme.colors.fat,
                  points: pointsFor('fat_g'),
                  formatValue: (n) => formatMass(n, system),
                  targetValue: targets?.fat_g,
                })}
              >
                <MacroBar
                  label={t('macros.fat')}
                  current={gToDisplayValue(report.avg_fat, system)}
                  target={gToDisplayValue(targets?.fat_g ?? (report.avg_fat || 1), system)}
                  color={theme.colors.fat}
                  unit={massUnitLabel(system)}
                  decimals={system === 'imperial' ? 1 : 0}
                />
              </AnimatedPressable>
            </Card>

            {tab === 'days' && (
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{t('progress.dayByDay')}</Text>
              {[...report.days].reverse().map((day) => (
                <Card key={day.date} style={{ opacity: day.calories === 0 ? 0.4 : 1 }}>
                  <View style={styles.dayRow}>
                    <Text style={[styles.dayDate, { color: theme.colors.textPrimary }]}>{day.date}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Text style={{ fontSize: 12, color: theme.colors.accent }}>{t('progress.netIn', { value: Math.round(day.calories) })}</Text>
                      {day.calories_burned > 0 && <Text style={{ fontSize: 12, color: theme.colors.calories }}>{t('progress.netOut', { value: Math.round(day.calories_burned) })}</Text>}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary }}>{t('progress.netTotal', { value: Math.round(day.net_calories) })}</Text>
                    </View>
                  </View>
                  {day.calories > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, color: theme.colors.protein }}>P {formatMass(day.protein_g, system)}</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.carbs }}>C {formatMass(day.carbs_g, system)}</Text>
                      <Text style={{ fontSize: 10, color: theme.colors.fat }}>F {formatMass(day.fat_g, system)}</Text>
                    </View>
                  )}
                </Card>
              ))}
            </View>
            )}
          </View>
        )
      )}

      <PaywallModal
        visible={showReportsPaywall}
        productId="advanced_reports"
        headline={t('progress.paywallHeadline')}
        onClose={() => setShowReportsPaywall(false)}
      />

      <MetricDetailModal
        visible={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ''}
        color={detail?.color ?? theme.colors.accent}
        points={detail?.points ?? []}
        formatValue={detail?.formatValue ?? ((n) => String(n))}
        targetValue={detail?.targetValue}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 14 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  tabBar: { flexDirection: 'row', padding: 4, gap: 4, marginBottom: 16 },
  dayRangeRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  dayRangeItem: { flex: 1, alignItems: 'center', paddingBottom: 8 },
  dayRangeIndicator: { height: 2, width: '55%', borderRadius: 1, marginTop: 8 },
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
