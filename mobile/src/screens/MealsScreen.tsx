import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { ErrorState } from '../components/ErrorState'
import { FoodSearchModal } from '../components/FoodSearchModal'
import { AddAmountModal } from '../components/AddAmountModal'
import { ShareQRModal } from '../components/ShareQRModal'
import { CameraScannerModal } from '../components/CameraScannerModal'
import { PaywallModal } from '../components/PaywallModal'
import { useTheme } from '../theme/ThemeProvider'
import { useMeals } from '../hooks/useMeals'
import { useFoodLog } from '../hooks/useFoodLog'
import { useEntitlements } from '../hooks/useEntitlements'
import { useTour, TourTarget } from '../contexts/TourContext'
import { useTourProgressStore } from '../store/useTourProgressStore'
import type { ProductId } from '../lib/products'
import { calcMacrosFromAmount, calcMealTotals } from '../lib/macroCalc'
import { encodeMealToQR, decodeMealFromQR, mealQRToIngredients, MealQRData } from '../lib/mealQR'
import type { FoodItem, Meal, MealIngredient } from '../types'
import type { CodeFormat } from 'react-native-camera-kit'

type BuildingIngredient = Omit<MealIngredient, 'id' | 'meal_id'>
type SearchMode = 'create' | 'edit'

// Stable reference: recreating this array on every render would tear down
// and rebuild the barcode scanner output, stalling live detection.
const QR_TYPES: CodeFormat[] = ['qr']

export default function MealsScreen() {
  const theme = useTheme()
  const { meals, loading, fetchError, createMeal, updateMeal, deleteMeal, touchMealUsed, refetch } = useMeals()
  const todayStr = new Date().toISOString().split('T')[0]
  const { addFoodLog } = useFoodLog(todayStr)
  const { checkAndIncrementMealCreated, checkAndIncrementQrShare, checkAndIncrementQrReceive } = useEntitlements()
  const [paywallProduct, setPaywallProduct] = useState<ProductId | null>(null)
  const { showTip } = useTour()
  const seenFeatureTips = useTourProgressStore((s) => s.seenFeatureTips)

  const mealScanTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_meal_scan || mealScanTipAttempted.current) return
    mealScanTipAttempted.current = true
    showTip('tip_meal_scan', { title: 'Copy a meal', body: "This scan is for copying someone else's saved meal, different from the daily-log scan on the Log tab." })
  }, [seenFeatureTips, showTip])

  const [creatingMeal, setCreatingMeal] = useState(false)
  const [mealName, setMealName] = useState('')
  const [ingredients, setIngredients] = useState<BuildingIngredient[]>([])

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIngredients, setEditIngredients] = useState<BuildingIngredient[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const [showSearch, setShowSearch] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('create')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)

  const [saving, setSaving] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [addingMealId, setAddingMealId] = useState<string | null>(null)

  const [qrMeal, setQRMeal] = useState<Meal | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [importingMeal, setImportingMeal] = useState<MealQRData | null>(null)
  const [importName, setImportName] = useState('')
  const [importSaving, setImportSaving] = useState(false)

  function openSearch(mode: SearchMode) {
    setSearchMode(mode)
    setShowSearch(true)
  }

  function startEdit(meal: Meal) {
    setEditingMealId(meal.id)
    setEditName(meal.name)
    setEditIngredients((meal.ingredients ?? []).map((i) => ({
      food_name: i.food_name, barcode: i.barcode, amount_g: i.amount_g, calories: i.calories,
      protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g, fiber_g: i.fiber_g,
    })))
  }

  function cancelEdit() {
    setEditingMealId(null)
    setEditName('')
    setEditIngredients([])
  }

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
  }

  function handleAmountConfirm(amount: number) {
    if (!selectedFood) return
    const macros = calcMacrosFromAmount(selectedFood, amount)
    const newIng: BuildingIngredient = {
      food_name: selectedFood.name, barcode: selectedFood.barcode, amount_g: amount, ...macros,
    }
    if (searchMode === 'edit') setEditIngredients((prev) => [...prev, newIng])
    else setIngredients((prev) => [...prev, newIng])
    setSelectedFood(null)
  }

  async function handleSaveMeal() {
    if (!mealName.trim() || ingredients.length === 0) return
    const allowed = await checkAndIncrementMealCreated()
    if (!allowed) { setPaywallProduct('unlimited_meals_favorites'); return }
    setSaving(true)
    const { error } = await createMeal(mealName.trim(), ingredients)
    setSaving(false)
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      Alert.alert("Couldn't save meal", error.message)
      return
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCreatingMeal(false)
    setMealName('')
    setIngredients([])
  }

  async function handleSaveEdit() {
    if (!editingMealId || !editName.trim()) return
    setEditSaving(true)
    await updateMeal(editingMealId, editName.trim(), editIngredients)
    setEditSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    cancelEdit()
  }

  async function handleAddToToday(meal: Meal) {
    if (!meal.ingredients || meal.ingredients.length === 0) return
    setAddingMealId(meal.id)
    touchMealUsed(meal.id)
    const ings = meal.ingredients
    await addFoodLog({
      logged_at: todayStr,
      meal_type: 'lunch',
      food_name: meal.name,
      amount_g: ings.reduce((s, i) => s + i.amount_g, 0),
      calories: ings.reduce((s, i) => s + i.calories, 0),
      protein_g: ings.reduce((s, i) => s + i.protein_g, 0),
      carbs_g: ings.reduce((s, i) => s + i.carbs_g, 0),
      fat_g: ings.reduce((s, i) => s + i.fat_g, 0),
      fiber_g: ings.reduce((s, i) => s + (i.fiber_g ?? 0), 0),
      sugar_g: 0,
      meal_ingredients: ings.map((i) => ({ food_name: i.food_name, amount_g: i.amount_g, calories: i.calories, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g })),
    })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setAddingMealId(null)
  }

  async function handleShareMeal(meal: Meal) {
    if (!(await checkAndIncrementQrShare())) { setPaywallProduct('qr_sharing_unlimited'); return }
    setQRMeal(meal)
  }

  function handleQRScan(text: string) {
    setShowScanner(false)
    const data = decodeMealFromQR(text)
    if (data) { setImportingMeal(data); setImportName(data.n) }
  }

  async function handleImportMeal() {
    if (!importingMeal || !importName.trim()) return
    if (!(await checkAndIncrementQrReceive())) { setPaywallProduct('qr_sharing_unlimited'); return }
    if (!(await checkAndIncrementMealCreated())) { setPaywallProduct('unlimited_meals_favorites'); return }
    setImportSaving(true)
    await createMeal(importName.trim(), mealQRToIngredients(importingMeal))
    setImportSaving(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setImportingMeal(null)
    setImportName('')
  }

  const buildingTotals = calcMealTotals(ingredients)

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Saved Meals</Text>
        {!creatingMeal && (
          <View style={styles.headerActions}>
            <TourTarget id="tip_meal_scan">
              <Pressable onPress={() => setShowScanner(true)} style={[styles.headerBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
                <Ionicons name="scan-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>Scan</Text>
              </Pressable>
            </TourTarget>
            <TourTarget id="tip_meal_new">
              <Pressable onPress={() => { Haptics.selectionAsync(); setCreatingMeal(true) }} style={[styles.headerBtn, { backgroundColor: theme.colors.accentSoft }]}>
                <Ionicons name="add" size={14} color={theme.colors.accent} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>New</Text>
              </Pressable>
            </TourTarget>
          </View>
        )}
      </View>

      {creatingMeal && (
        <Card style={{ marginBottom: 14, gap: 14 }}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>New Meal</Text>
            <Pressable onPress={() => { setCreatingMeal(false); setIngredients([]); setMealName('') }}>
              <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
          <TextInput
            placeholder="Meal name (e.g. Post-workout)"
            placeholderTextColor={theme.colors.textTertiary}
            value={mealName}
            onChangeText={setMealName}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
          {ingredients.length > 0 && (
            <View style={{ gap: 8 }}>
              {ingredients.map((ing, i) => (
                <View key={`${ing.food_name}-${i}`} style={[styles.ingRow, { backgroundColor: theme.colors.backgroundElevated }]}>
                  <View>
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.food_name}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{ing.amount_g}g · {ing.calories} kcal</Text>
                  </View>
                  <Pressable onPress={() => setIngredients((prev) => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.totalsRow}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.accent }}>{Math.round(buildingTotals.calories)} kcal</Text>
                <Text style={{ fontSize: 12, color: theme.colors.protein }}>P {Math.round(buildingTotals.protein_g)}g</Text>
                <Text style={{ fontSize: 12, color: theme.colors.carbs }}>C {Math.round(buildingTotals.carbs_g)}g</Text>
                <Text style={{ fontSize: 12, color: theme.colors.fat }}>F {Math.round(buildingTotals.fat_g)}g</Text>
              </View>
            </View>
          )}
          <Pressable onPress={() => openSearch('create')} style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}>
            <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>Add Ingredient</Text>
          </Pressable>
          <Pressable
            onPress={handleSaveMeal}
            disabled={saving || !mealName.trim() || ingredients.length === 0}
            style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: saving || !mealName.trim() || ingredients.length === 0 ? 0.5 : 1 }]}
          >
            {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
            <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Save Meal</Text>
          </Pressable>
        </Card>
      )}

      {loading && <LoadingState minHeight={200} />}
      {!loading && fetchError && <ErrorState message="Couldn't load your meals." onRetry={refetch} />}

      {!loading && !fetchError && meals.length === 0 && !creatingMeal && (
        <EmptyState icon="book-outline" title="No saved meals yet" subtitle="Tap New to create your first meal" />
      )}

      <View style={{ gap: 10 }}>
        {meals.map((meal) => {
          if (editingMealId === meal.id) {
            const editTotals = calcMealTotals(editIngredients)
            return (
              <Card key={meal.id} style={{ gap: 14 }}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>Edit Meal</Text>
                  <Pressable onPress={cancelEdit}>
                    <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
                />
                {editIngredients.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {editIngredients.map((ing, i) => (
                      <View key={`${ing.food_name}-${i}`} style={[styles.ingRow, { backgroundColor: theme.colors.backgroundElevated }]}>
                        <View>
                          <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.food_name}</Text>
                          <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{ing.amount_g}g · {ing.calories} kcal</Text>
                        </View>
                        <Pressable onPress={() => setEditIngredients((prev) => prev.filter((_, j) => j !== i))}>
                          <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
                        </Pressable>
                      </View>
                    ))}
                    <View style={styles.totalsRow}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.accent }}>{Math.round(editTotals.calories)} kcal</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.protein }}>P {Math.round(editTotals.protein_g)}g</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.carbs }}>C {Math.round(editTotals.carbs_g)}g</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.fat }}>F {Math.round(editTotals.fat_g)}g</Text>
                    </View>
                  </View>
                )}
                <Pressable onPress={() => openSearch('edit')} style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}>
                  <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>Add Ingredient</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={editSaving || !editName.trim() || editIngredients.length === 0}
                  style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: editSaving || !editName.trim() || editIngredients.length === 0 ? 0.5 : 1 }]}
                >
                  {editSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name="checkmark" size={16} color={theme.colors.onAccent} />}
                  <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Save Changes</Text>
                </Pressable>
              </Card>
            )
          }

          const expanded = expandedMeal === meal.id
          const totals = calcMealTotals(meal.ingredients ?? [])

          return (
            <Card key={meal.id} style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: 14 }}>
                <View style={styles.mealTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealTitle, { color: theme.colors.textPrimary }]}>{meal.name}</Text>
                    <View style={styles.totalsRow}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.accent }}>{Math.round(totals.calories)} kcal</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.protein }}>P {Math.round(totals.protein_g)}g</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.carbs }}>C {Math.round(totals.carbs_g)}g</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.fat }}>F {Math.round(totals.fat_g)}g</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.mealActions}>
                  <Pressable
                    onPress={() => handleAddToToday(meal)}
                    disabled={addingMealId === meal.id}
                    style={[styles.todayPill, { backgroundColor: theme.colors.accentSoft }]}
                  >
                    {addingMealId === meal.id ? (
                      <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : (
                      <Ionicons name="add" size={13} color={theme.colors.accent} />
                    )}
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>Today</Text>
                  </Pressable>
                  <Pressable onPress={() => startEdit(meal)} style={styles.iconAction}>
                    <Ionicons name="pencil" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                  <Pressable onPress={() => handleShareMeal(meal)} style={styles.iconAction}>
                    <Ionicons name="qr-code-outline" size={17} color={theme.colors.textTertiary} />
                  </Pressable>
                  <Pressable onPress={() => { Haptics.selectionAsync(); deleteMeal(meal.id) }} style={styles.iconAction}>
                    <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                  </Pressable>
                  <Pressable onPress={() => setExpandedMeal(expanded ? null : meal.id)} style={styles.iconAction}>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
              {expanded && meal.ingredients && meal.ingredients.length > 0 && (
                <View>
                  {meal.ingredients.map((ing) => (
                    <View key={ing.id} style={[styles.itemRow, { borderTopColor: theme.colors.cardBorder }]}>
                      <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.food_name}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{ing.amount_g}g · {Math.round(ing.calories)} kcal</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )
        })}
      </View>

      <FoodSearchModal
        visible={showSearch}
        onSelect={handleFoodSelect}
        onClose={() => setShowSearch(false)}
      />

      <AddAmountModal
        visible={!!selectedFood}
        food={selectedFood}
        onConfirm={handleAmountConfirm}
        onClose={() => { setSelectedFood(null); setShowSearch(true) }}
      />

      {qrMeal && (
        <ShareQRModal
          visible={!!qrMeal}
          title="Share Meal"
          qrValue={encodeMealToQR(qrMeal)}
          heading={qrMeal.name}
          meta={(() => {
            const t = calcMealTotals(qrMeal.ingredients ?? [])
            return [
              { label: `${Math.round(t.calories)} kcal`, color: theme.colors.accent },
              { label: `P ${Math.round(t.protein_g)}g`, color: theme.colors.protein },
              { label: `C ${Math.round(t.carbs_g)}g`, color: theme.colors.carbs },
              { label: `F ${Math.round(t.fat_g)}g`, color: theme.colors.fat },
            ]
          })()}
          hint="Ask your friend to scan this with MacroTrack"
          onClose={() => setQRMeal(null)}
        />
      )}

      <CameraScannerModal
        visible={showScanner}
        title="Scan Meal QR"
        hint="Point camera at a MacroTrack meal QR code"
        types={QR_TYPES}
        shape="square"
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />

      <Modal visible={!!importingMeal} animationType="slide" transparent onRequestClose={() => setImportingMeal(null)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setImportingMeal(null)} />
          <SafeAreaView edges={['bottom']} style={[styles.importSheet, { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.style.cardRadius + 6, borderTopRightRadius: theme.style.cardRadius + 6 }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>Import Meal</Text>
              <Pressable onPress={() => setImportingMeal(null)}>
                <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 6 }}>Meal name (rename or keep as is)</Text>
            <TextInput
              value={importName}
              onChangeText={setImportName}
              style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8, marginBottom: 12 }]}
            />
            <ScrollView style={{ maxHeight: 260 }}>
              {importingMeal?.i.map((ing, i) => (
                <View key={`${ing.n}-${i}`} style={[styles.ingRow, { backgroundColor: theme.colors.backgroundElevated, marginBottom: 6 }]}>
                  <View>
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.n}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{ing.a}g</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{ing.c} kcal</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={handleImportMeal}
              disabled={importSaving || !importName.trim()}
              style={[styles.importButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
            >
              {importSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Save to My Meals</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <PaywallModal
        visible={!!paywallProduct}
        productId={paywallProduct}
        headline={paywallProduct === 'unlimited_meals_favorites' ? 'Save unlimited meals' : 'Share unlimited meals & logs'}
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
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 15, fontWeight: '700' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  totalsRow: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  mealTopRow: { flexDirection: 'row' },
  mealTitle: { fontSize: 15, fontWeight: '700' },
  mealActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  iconAction: { padding: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  importSheet: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, maxHeight: '80%' },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginTop: 12 },
})
