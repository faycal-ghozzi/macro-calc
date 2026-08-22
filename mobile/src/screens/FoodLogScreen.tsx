import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useRoute, useNavigation } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { FoodSearchModal } from '../components/FoodSearchModal'
import { AddAmountModal } from '../components/AddAmountModal'
import { ExerciseModal } from '../components/ExerciseModal'
import { EditFoodLogModal } from '../components/EditFoodLogModal'
import { ShareQRModal } from '../components/ShareQRModal'
import { CameraScannerModal } from '../components/CameraScannerModal'
import { PaywallModal } from '../components/PaywallModal'
import { useTheme } from '../theme/ThemeProvider'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
import { useMeals } from '../hooks/useMeals'
import { useEntitlements } from '../hooks/useEntitlements'
import { useTour, TourTarget } from '../contexts/TourContext'
import { useTourProgressStore } from '../store/useTourProgressStore'
import { calcMacrosFromAmount } from '../lib/macroCalc'
import { encodeLogToQR, decodeLogFromQR, logEntryMealType, LogQRData } from '../lib/logQR'
import type { TabParamList } from '../navigation/TabNavigator'
import type { FoodItem, Meal, MealType, FoodLog as FoodLogEntry } from '../types'
import type { CodeFormat } from 'react-native-camera-kit'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
// Stable reference: recreating this array on every render would tear down
// and rebuild the barcode scanner output, stalling live detection.
const QR_TYPES: CodeFormat[] = ['qr']
const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
}

type LogRoute = RouteProp<TabParamList, 'Log'>

export default function FoodLogScreen() {
  const theme = useTheme()
  const route = useRoute<LogRoute>()
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>()
  const todayStr = new Date().toISOString().split('T')[0]
  const dateStr = route.params?.date ?? todayStr

  const { logs, byMeal, addFoodLog, updateFoodLog, deleteFoodLog } = useFoodLog(dateStr)
  const { logs: exerciseLogs, totalBurned, addExerciseLog, deleteExerciseLog } = useExerciseLog(dateStr)
  const { touchMealUsed } = useMeals()
  const { checkAndIncrementQrShare, checkAndIncrementQrReceive } = useEntitlements()
  const [paywallProduct, setPaywallProduct] = useState<'qr_sharing_unlimited' | null>(null)
  const { showTip } = useTour()
  const seenFeatureTips = useTourProgressStore((s) => s.seenFeatureTips)

  const logShareTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_log_share || logShareTipAttempted.current) return
    logShareTipAttempted.current = true
    showTip('tip_log_share', { title: 'Share your daily log', body: 'Generate a QR code of your whole day for a friend to scan and import.' })
  }, [seenFeatureTips, showTip])

  const logScanTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_log_scan || logScanTipAttempted.current) return
    logScanTipAttempted.current = true
    showTip('tip_log_scan', { title: 'Copy a daily log', body: "This scan is for copying someone else's daily log into yours." })
  }, [seenFeatureTips, showTip])

  const [pendingMeal, setPendingMeal] = useState<MealType | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showExercise, setShowExercise] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [showShareQR, setShowShareQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [importingLog, setImportingLog] = useState<LogQRData | null>(null)
  const [importSaving, setImportSaving] = useState(false)

  useEffect(() => {
    if (route.params?.meal) {
      setPendingMeal(route.params.meal)
      setShowSearch(true)
      navigation.setParams({ meal: undefined })
    }
  }, [route.params?.meal])

  function handleAddClick(meal: MealType) {
    Haptics.selectionAsync()
    setPendingMeal(meal)
    setShowSearch(true)
  }

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
  }

  async function handleMealSelect(meal: Meal) {
    if (!meal.ingredients || !pendingMeal) return
    setShowSearch(false)
    touchMealUsed(meal.id)
    const ings = meal.ingredients
    await addFoodLog({
      logged_at: dateStr,
      meal_type: pendingMeal,
      food_name: meal.name,
      amount_g: ings.reduce((s, i) => s + i.amount_g, 0),
      calories: ings.reduce((s, i) => s + i.calories, 0),
      protein_g: ings.reduce((s, i) => s + i.protein_g, 0),
      carbs_g: ings.reduce((s, i) => s + i.carbs_g, 0),
      fat_g: ings.reduce((s, i) => s + i.fat_g, 0),
      fiber_g: ings.reduce((s, i) => s + (i.fiber_g ?? 0), 0),
      sugar_g: 0,
      meal_ingredients: ings.map((i) => ({
        food_name: i.food_name, amount_g: i.amount_g, calories: i.calories, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g,
      })),
    })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setPendingMeal(null)
  }

  async function handleAmountConfirm(amount: number) {
    if (!selectedFood || !pendingMeal) return
    const macros = calcMacrosFromAmount(selectedFood, amount)
    await addFoodLog({
      logged_at: dateStr,
      meal_type: pendingMeal,
      food_name: selectedFood.name,
      barcode: selectedFood.barcode,
      amount_g: amount,
      ...macros,
    })
    setSelectedFood(null)
    setPendingMeal(null)
  }

  async function handleShareLog() {
    if (!(await checkAndIncrementQrShare())) { setPaywallProduct('qr_sharing_unlimited'); return }
    setShowShareQR(true)
  }

  function handleLogScan(text: string) {
    setShowScanner(false)
    const data = decodeLogFromQR(text)
    if (data) setImportingLog(data)
  }

  async function handleImportLog() {
    if (!importingLog) return
    if (!(await checkAndIncrementQrReceive())) { setPaywallProduct('qr_sharing_unlimited'); return }
    setImportSaving(true)
    for (const entry of importingLog.e) {
      await addFoodLog({
        logged_at: dateStr,
        meal_type: logEntryMealType(entry),
        food_name: entry.n,
        amount_g: entry.a,
        calories: entry.c,
        protein_g: entry.p,
        carbs_g: entry.cb,
        fat_g: entry.f,
        fiber_g: entry.fi,
        sugar_g: 0,
      })
    }
    setImportSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setImportingLog(null)
  }

  const totalCals = logs.reduce((s, l) => s + l.calories, 0)
  const netCals = totalCals - totalBurned

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {dateStr === todayStr ? "Today's Log" : dateStr}
        </Text>
        <View style={styles.headerActions}>
          <TourTarget id="tip_log_scan">
            <Pressable onPress={() => setShowScanner(true)} style={[styles.headerBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name="scan-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>Scan</Text>
            </Pressable>
          </TourTarget>
          <TourTarget id="tip_log_share">
            <Pressable onPress={handleShareLog} style={[styles.headerBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name="qr-code-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>Share</Text>
            </Pressable>
          </TourTarget>
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Eaten</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{Math.round(totalCals)}</Text>
        </View>
        {totalBurned > 0 && (
          <>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 16 }}>−</Text>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Burned</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.calories }]}>{Math.round(totalBurned)}</Text>
            </View>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 16 }}>=</Text>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Net</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>{Math.round(netCals)}</Text>
            </View>
          </>
        )}
      </Card>

      <View style={{ gap: 10, marginTop: 14 }}>
        {MEAL_TYPES.map((meal) => {
          const items = byMeal(meal)
          const mealCals = items.reduce((s, i) => s + i.calories, 0)
          const mealProt = items.reduce((s, i) => s + i.protein_g, 0)
          return (
            <Card key={meal} style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.mealHeader}>
                <View style={styles.mealLeft}>
                  <View style={[styles.mealIcon, { backgroundColor: theme.colors.accentSoft }]}>
                    <Ionicons name={MEAL_ICONS[meal]} size={16} color={theme.colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.mealName, { color: theme.colors.textPrimary }]}>
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Text>
                    {items.length === 0 ? (
                      <Text style={[styles.mealMeta, { color: theme.colors.textTertiary }]}>No items yet</Text>
                    ) : (
                      <Text style={[styles.mealMeta, { color: theme.colors.textTertiary }]}>
                        {Math.round(mealCals)} kcal · {Math.round(mealProt)}g protein
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable onPress={() => handleAddClick(meal)} style={[styles.addPill, { backgroundColor: theme.colors.accentSoft }]}>
                  <Ionicons name="add" size={14} color={theme.colors.accent} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>Add</Text>
                </Pressable>
              </View>

              {items.map((item) => {
                const isMealEntry = !!item.meal_ingredients?.length
                const isExpanded = expandedEntry === item.id
                return (
                  <View key={item.id} style={[styles.itemRow, { borderTopColor: theme.colors.cardBorder }]}>
                    <View style={styles.itemMain}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemNameRow}>
                          <Text style={[styles.itemName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{item.food_name}</Text>
                          {isMealEntry && (
                            <View style={[styles.mealTag, { backgroundColor: theme.colors.accentSoft }]}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.accent }}>MEAL</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.itemAmount, { color: theme.colors.textTertiary }]}>{item.amount_g}g</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemCals, { color: theme.colors.textPrimary }]}>{Math.round(item.calories)}</Text>
                        <View style={styles.itemMacros}>
                          <Text style={{ fontSize: 9, color: theme.colors.protein }}>P{item.protein_g}</Text>
                          <Text style={{ fontSize: 9, color: theme.colors.carbs }}>C{item.carbs_g}</Text>
                          <Text style={{ fontSize: 9, color: theme.colors.fat }}>F{item.fat_g}</Text>
                        </View>
                      </View>
                      <View style={styles.itemActions}>
                        {isMealEntry && (
                          <Pressable onPress={() => setExpandedEntry(isExpanded ? null : item.id)} style={styles.iconBtn}>
                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
                          </Pressable>
                        )}
                        <Pressable onPress={() => setEditingEntry(item)} style={styles.iconBtn}>
                          <Ionicons name="pencil" size={15} color={theme.colors.textTertiary} />
                        </Pressable>
                        <Pressable onPress={() => { Haptics.selectionAsync(); deleteFoodLog(item.id) }} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                    {isMealEntry && isExpanded && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 6 }}>
                        {item.meal_ingredients!.map((ing, idx) => (
                          <View key={`${ing.food_name}-${idx}`} style={[styles.subIngredient, { backgroundColor: theme.colors.backgroundElevated }]}>
                            <View>
                              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{ing.food_name}</Text>
                              <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{ing.amount_g}g</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{Math.round(ing.calories)} kcal</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )
              })}
            </Card>
          )
        })}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={styles.mealHeader}>
            <View style={styles.mealLeft}>
              <View style={[styles.mealIcon, { backgroundColor: theme.colors.calories + '22' }]}>
                <Ionicons name="flame-outline" size={16} color={theme.colors.calories} />
              </View>
              <View>
                <Text style={[styles.mealName, { color: theme.colors.textPrimary }]}>Exercise</Text>
                {totalBurned > 0 && (
                  <Text style={[styles.mealMeta, { color: theme.colors.calories }]}>{Math.round(totalBurned)} kcal burned</Text>
                )}
              </View>
            </View>
            <Pressable onPress={() => setShowExercise(true)} style={[styles.addPill, { backgroundColor: theme.colors.calories + '22' }]}>
              <Ionicons name="add" size={14} color={theme.colors.calories} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.calories }}>Add</Text>
            </Pressable>
          </View>
          {exerciseLogs.map((ex) => (
            <View key={ex.id} style={[styles.itemRow, { borderTopColor: theme.colors.cardBorder }]}>
              <View style={styles.itemMain}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{ex.name}</Text>
                  {ex.duration_min ? <Text style={[styles.itemAmount, { color: theme.colors.textTertiary }]}>{ex.duration_min} min</Text> : null}
                </View>
                <Text style={[styles.itemCals, { color: theme.colors.calories }]}>{Math.round(ex.calories_burned)}</Text>
                <Pressable onPress={() => { Haptics.selectionAsync(); deleteExerciseLog(ex.id) }} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </View>

      <FoodSearchModal
        visible={showSearch}
        onSelect={handleFoodSelect}
        onClose={() => { setShowSearch(false); setPendingMeal(null) }}
        onSelectMeal={handleMealSelect}
      />

      <AddAmountModal
        visible={!!selectedFood}
        food={selectedFood}
        onConfirm={handleAmountConfirm}
        onClose={() => { setSelectedFood(null); setShowSearch(true) }}
      />

      <ExerciseModal
        visible={showExercise}
        onAdd={async (entry) => { await addExerciseLog({ ...entry, logged_at: dateStr }) }}
        onClose={() => setShowExercise(false)}
      />

      <EditFoodLogModal
        visible={!!editingEntry}
        entry={editingEntry}
        onSave={async (updates) => { if (editingEntry) await updateFoodLog(editingEntry.id, updates) }}
        onClose={() => setEditingEntry(null)}
      />

      <ShareQRModal
        visible={showShareQR}
        title="Share Daily Log"
        qrValue={encodeLogToQR(logs, dateStr)}
        heading={dateStr}
        meta={[{ label: `${logs.length} item${logs.length === 1 ? '' : 's'}`, color: theme.colors.textSecondary }, { label: `${Math.round(totalCals)} kcal`, color: theme.colors.accent }]}
        hint="Ask them to tap Scan on their Log tab"
        onClose={() => setShowShareQR(false)}
      />

      <CameraScannerModal
        visible={showScanner}
        title="Scan Daily Log QR"
        hint="Point camera at a MacroTrack daily log QR code"
        types={QR_TYPES}
        shape="square"
        onScan={handleLogScan}
        onClose={() => setShowScanner(false)}
      />

      <Modal visible={!!importingLog} animationType="slide" transparent onRequestClose={() => setImportingLog(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setImportingLog(null)} />
          <SafeAreaView edges={['bottom']} style={[styles.importSheet, { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.style.cardRadius + 6, borderTopRightRadius: theme.style.cardRadius + 6 }]}>
            <View style={styles.importHeader}>
              <View>
                <Text style={[styles.title, { fontSize: 16, color: theme.colors.textPrimary }]}>Import Log</Text>
                {importingLog && <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginTop: 2 }}>From {importingLog.d}</Text>}
              </View>
              <Pressable onPress={() => setImportingLog(null)} style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {importingLog && MEAL_TYPES.map((mt) => {
                const entries = importingLog.e.filter((e) => logEntryMealType(e) === mt)
                if (entries.length === 0) return null
                return (
                  <View key={mt} style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 4, textTransform: 'capitalize' }}>{mt}</Text>
                    {entries.map((entry, i) => (
                      <View key={`${entry.n}-${i}`} style={[styles.subIngredient, { backgroundColor: theme.colors.backgroundElevated, marginBottom: 4 }]}>
                        <View>
                          <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{entry.n}</Text>
                          <Text style={{ fontSize: 10, color: theme.colors.textTertiary }}>{entry.a}g</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{entry.c} kcal</Text>
                      </View>
                    ))}
                  </View>
                )
              })}
            </ScrollView>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary, textAlign: 'center', marginTop: 6 }}>
              Will be added to {dateStr === todayStr ? 'today' : dateStr}
            </Text>
            <Pressable
              onPress={handleImportLog}
              disabled={importSaving}
              style={[styles.importButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
            >
              {importSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Add to My Log</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <PaywallModal
        visible={!!paywallProduct}
        productId={paywallProduct}
        headline="Share unlimited meals & logs"
        onClose={() => setPaywallProduct(null)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryCell: { alignItems: 'center' },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  mealIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mealName: { fontSize: 14, fontWeight: '600' },
  mealMeta: { fontSize: 11, marginTop: 1 },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  itemRow: { borderTopWidth: StyleSheet.hairlineWidth },
  itemMain: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  itemAmount: { fontSize: 11, marginTop: 1 },
  itemCals: { fontSize: 13, fontWeight: '700' },
  itemMacros: { flexDirection: 'row', gap: 5, marginTop: 2 },
  itemActions: { flexDirection: 'row' },
  iconBtn: { padding: 6 },
  mealTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  subIngredient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  importSheet: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  importHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginTop: 12 },
})
