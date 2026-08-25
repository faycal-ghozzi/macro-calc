import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
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
import { useTour, TourTarget, EMPTY_SEEN_TIPS } from '../contexts/TourContext'
import { useProfile } from '../hooks/useProfile'
import type { ProductId } from '../lib/products'
import { calcMacrosFromAmount, calcMealTotals, roundTo2 } from '../lib/macroCalc'
import { useUnitsStore } from '../store/useUnitsStore'
import { formatMass } from '../lib/units'
import { encodeMealToQR, decodeMealFromQR, mealQRToIngredients, MealQRData } from '../lib/mealQR'
import type { TabParamList } from '../navigation/TabNavigator'
import type { FoodItem, Meal, MealIngredient } from '../types'
import type { CodeFormat } from 'react-native-camera-kit'

type BuildingIngredient = Omit<MealIngredient, 'id' | 'meal_id'>
type SearchMode = 'create' | 'edit'

// Stable reference: recreating this array on every render would tear down
// and rebuild the barcode scanner output, stalling live detection.
const QR_TYPES: CodeFormat[] = ['qr']

export default function MealsScreen() {
  const theme = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>()
  const { system } = useUnitsStore()
  const { meals, loading, fetchError, createMeal, updateMeal, deleteMeal, touchMealUsed, refetch } = useMeals()
  const todayStr = new Date().toISOString().split('T')[0]
  const { addFoodLog } = useFoodLog(todayStr)
  const { checkAndIncrementMealCreated, checkAndIncrementQrShare, checkAndIncrementQrReceive } = useEntitlements()
  const [paywallProduct, setPaywallProduct] = useState<ProductId | null>(null)
  const { showTip } = useTour()
  const { profile } = useProfile()
  const seenFeatureTips = profile?.seen_feature_tips ?? EMPTY_SEEN_TIPS

  const mealScanTipAttempted = useRef(false)
  useEffect(() => {
    if (seenFeatureTips.tip_meal_scan || mealScanTipAttempted.current) return
    mealScanTipAttempted.current = true
    showTip('tip_meal_scan', { title: t('tour.tipMealScanTitle'), body: t('tour.tipMealScanBody') })
  }, [seenFeatureTips, showTip, t])

  const [creatingMeal, setCreatingMeal] = useState(false)
  const [mealName, setMealName] = useState('')
  const [ingredients, setIngredients] = useState<BuildingIngredient[]>([])

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIngredients, setEditIngredients] = useState<BuildingIngredient[]>([])
  const [editSaving, setEditSaving] = useState(false)

  const [mealQuery, setMealQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('create')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<{ index: number; mode: SearchMode } | null>(null)

  const [saving, setSaving] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [addingMealId, setAddingMealId] = useState<string | null>(null)

  const [qrMeal, setQRMeal] = useState<Meal | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [importingMeal, setImportingMeal] = useState<MealQRData | null>(null)
  const [importName, setImportName] = useState('')
  const [importSaving, setImportSaving] = useState(false)

  function handleSettingsPress() {
    Haptics.selectionAsync()
    navigation.navigate('Profile', { screen: 'Settings' })
  }

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

  // Reconstructs a per-100g FoodItem from an already-added ingredient's
  // absolute macros, so the existing amount-picker UI (unit switching, quick
  // amounts, live macro preview) can be reused to edit its quantity instead
  // of building a separate editor from scratch.
  function ingredientToFoodItem(ing: BuildingIngredient): FoodItem {
    const ratio = ing.amount_g / 100
    return {
      name: ing.food_name,
      barcode: ing.barcode,
      calories_100g: ratio > 0 ? Math.round(ing.calories / ratio) : 0,
      protein_100g: ratio > 0 ? roundTo2(ing.protein_g / ratio) : 0,
      carbs_100g: ratio > 0 ? roundTo2(ing.carbs_g / ratio) : 0,
      fat_100g: ratio > 0 ? roundTo2(ing.fat_g / ratio) : 0,
      fiber_100g: ing.fiber_g != null && ratio > 0 ? roundTo2(ing.fiber_g / ratio) : undefined,
      source: 'common',
    }
  }

  function handleEditIngredientAmount(index: number, mode: SearchMode) {
    const ing = (mode === 'edit' ? editIngredients : ingredients)[index]
    if (!ing) return
    Haptics.selectionAsync()
    setSearchMode(mode)
    setEditingIngredient({ index, mode })
    setSelectedFood(ingredientToFoodItem(ing))
  }

  function handleAmountConfirm(amount: number) {
    if (!selectedFood) return
    const macros = calcMacrosFromAmount(selectedFood, amount)
    const newIng: BuildingIngredient = {
      food_name: selectedFood.name, barcode: selectedFood.barcode, amount_g: amount, ...macros,
    }
    if (editingIngredient) {
      const setList = editingIngredient.mode === 'edit' ? setEditIngredients : setIngredients
      setList((prev) => prev.map((item, i) => (i === editingIngredient.index ? newIng : item)))
      setEditingIngredient(null)
    } else if (searchMode === 'edit') {
      setEditIngredients((prev) => [...prev, newIng])
    } else {
      setIngredients((prev) => [...prev, newIng])
    }
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
      Alert.alert(t('meals.saveErrorTitle'), error.message)
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
    const totals = calcMealTotals(ings)
    await addFoodLog({
      logged_at: todayStr,
      meal_type: 'lunch',
      food_name: meal.name,
      amount_g: roundTo2(ings.reduce((s, i) => s + i.amount_g, 0)),
      calories: totals.calories,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      fiber_g: roundTo2(ings.reduce((s, i) => s + (i.fiber_g ?? 0), 0)),
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
  const filteredMeals = !editingMealId && mealQuery.trim()
    ? meals.filter((m) => m.name.toLowerCase().includes(mealQuery.trim().toLowerCase()))
    : meals

  return (
    <Screen contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
      <View style={styles.topRow}>
        <Pressable onPress={handleSettingsPress} style={[styles.iconBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
          <Ionicons name="settings-outline" size={18} color={theme.colors.textSecondary} />
        </Pressable>
        {!creatingMeal && (
          <View style={styles.headerActions}>
            <TourTarget id="tip_meal_scan">
              <Pressable onPress={() => setShowScanner(true)} style={[styles.headerBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
                <Ionicons name="scan-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>{t('meals.scan')}</Text>
              </Pressable>
            </TourTarget>
            <TourTarget id="tip_meal_new">
              <Pressable onPress={() => { Haptics.selectionAsync(); setCreatingMeal(true) }} style={[styles.headerBtn, { backgroundColor: theme.colors.accentSoft }]}>
                <Ionicons name="add" size={14} color={theme.colors.accent} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>{t('meals.new')}</Text>
              </Pressable>
            </TourTarget>
          </View>
        )}
      </View>

      {creatingMeal && (
        <Card style={{ marginBottom: 14, gap: 14 }}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>{t('meals.newMealHeader')}</Text>
            <Pressable onPress={() => { setCreatingMeal(false); setIngredients([]); setMealName('') }}>
              <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
          <TextInput
            placeholder={t('meals.namePlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            value={mealName}
            onChangeText={setMealName}
            style={[styles.input, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 8 }]}
          />
          {ingredients.length > 0 && (
            <View style={{ gap: 8 }}>
              {ingredients.map((ing, i) => (
                <View key={`${ing.food_name}-${i}`} style={[styles.ingRow, { backgroundColor: theme.colors.backgroundElevated }]}>
                  <Pressable style={styles.ingRowInfo} onPress={() => handleEditIngredientAmount(i, 'create')}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.food_name}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{formatMass(ing.amount_g, system)} · {Math.round(ing.calories)} {t('common.kcal')}</Text>
                    </View>
                    <Ionicons name="pencil-outline" size={13} color={theme.colors.textTertiary} />
                  </Pressable>
                  <Pressable onPress={() => setIngredients((prev) => prev.filter((_, j) => j !== i))} style={styles.ingRowDelete}>
                    <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
              <View style={styles.totalsRow}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.accent }}>{Math.round(buildingTotals.calories)} {t('common.kcal')}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.protein }}>P {formatMass(buildingTotals.protein_g, system)}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.carbs }}>C {formatMass(buildingTotals.carbs_g, system)}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.fat }}>F {formatMass(buildingTotals.fat_g, system)}</Text>
              </View>
            </View>
          )}
          <Pressable onPress={() => openSearch('create')} style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}>
            <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{t('meals.addIngredient')}</Text>
          </Pressable>
          <Pressable
            onPress={handleSaveMeal}
            disabled={saving || !mealName.trim() || ingredients.length === 0}
            style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: saving || !mealName.trim() || ingredients.length === 0 ? 0.5 : 1 }]}
          >
            {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
            <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('meals.saveMeal')}</Text>
          </Pressable>
        </Card>
      )}

      {loading && <LoadingState minHeight={200} />}
      {!loading && fetchError && <ErrorState message={t('meals.loadErrorMessage')} onRetry={refetch} />}

      {!loading && !fetchError && !creatingMeal && !editingMealId && meals.length > 0 && (
        <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6, marginBottom: 10 }]}>
          <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
          <TextInput
            placeholder={t('meals.searchPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            value={mealQuery}
            onChangeText={setMealQuery}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          />
        </View>
      )}

      {!loading && !fetchError && meals.length === 0 && !creatingMeal && (
        <EmptyState icon="book-outline" title={t('meals.emptyTitle')} subtitle={t('meals.emptySubtitle')} />
      )}

      {!loading && !fetchError && meals.length > 0 && filteredMeals.length === 0 && (
        <EmptyState icon="search-outline" title={t('food.noResultsTitle')} />
      )}

      <View style={{ gap: 10 }}>
        {filteredMeals.map((meal) => {
          if (editingMealId === meal.id) {
            const editTotals = calcMealTotals(editIngredients)
            return (
              <Card key={meal.id} style={{ gap: 14 }}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>{t('meals.editMealHeader')}</Text>
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
                        <Pressable style={styles.ingRowInfo} onPress={() => handleEditIngredientAmount(i, 'edit')}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{ing.food_name}</Text>
                            <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{formatMass(ing.amount_g, system)} · {Math.round(ing.calories)} {t('common.kcal')}</Text>
                          </View>
                          <Ionicons name="pencil-outline" size={13} color={theme.colors.textTertiary} />
                        </Pressable>
                        <Pressable onPress={() => setEditIngredients((prev) => prev.filter((_, j) => j !== i))} style={styles.ingRowDelete}>
                          <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
                        </Pressable>
                      </View>
                    ))}
                    <View style={styles.totalsRow}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.accent }}>{Math.round(editTotals.calories)} {t('common.kcal')}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.protein }}>P {formatMass(editTotals.protein_g, system)}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.carbs }}>C {formatMass(editTotals.carbs_g, system)}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.fat }}>F {formatMass(editTotals.fat_g, system)}</Text>
                    </View>
                  </View>
                )}
                <Pressable onPress={() => openSearch('edit')} style={[styles.secondaryButton, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}>
                  <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary }}>{t('meals.addIngredient')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={editSaving || !editName.trim() || editIngredients.length === 0}
                  style={[styles.primaryButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 8, opacity: editSaving || !editName.trim() || editIngredients.length === 0 ? 0.5 : 1 }]}
                >
                  {editSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Ionicons name="checkmark" size={16} color={theme.colors.onAccent} />}
                  <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('meals.saveChanges')}</Text>
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
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.accent }}>{Math.round(totals.calories)} {t('common.kcal')}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.protein }}>P {formatMass(totals.protein_g, system)}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.carbs }}>C {formatMass(totals.carbs_g, system)}</Text>
                      <Text style={{ fontSize: 11, color: theme.colors.fat }}>F {formatMass(totals.fat_g, system)}</Text>
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
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.accent }}>{t('meals.today')}</Text>
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
                      <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{formatMass(ing.amount_g, system)} · {Math.round(ing.calories)} {t('common.kcal')}</Text>
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
        onClose={() => {
          setSelectedFood(null)
          if (!editingIngredient) setShowSearch(true)
          setEditingIngredient(null)
        }}
        initialAmountG={
          editingIngredient
            ? (editingIngredient.mode === 'edit' ? editIngredients : ingredients)[editingIngredient.index]?.amount_g
            : undefined
        }
        confirmLabelKey={editingIngredient ? 'addAmount.updateAmount' : 'addAmount.addToLog'}
      />

      {qrMeal && (
        <ShareQRModal
          visible={!!qrMeal}
          title={t('meals.shareTitle')}
          qrValue={encodeMealToQR(qrMeal)}
          heading={qrMeal.name}
          meta={(() => {
            const qrTotals = calcMealTotals(qrMeal.ingredients ?? [])
            return [
              { label: `${Math.round(qrTotals.calories)} ${t('common.kcal')}`, color: theme.colors.accent },
              { label: `P ${formatMass(qrTotals.protein_g, system)}`, color: theme.colors.protein },
              { label: `C ${formatMass(qrTotals.carbs_g, system)}`, color: theme.colors.carbs },
              { label: `F ${formatMass(qrTotals.fat_g, system)}`, color: theme.colors.fat },
            ]
          })()}
          hint={t('meals.shareHint')}
          onClose={() => setQRMeal(null)}
        />
      )}

      <CameraScannerModal
        visible={showScanner}
        title={t('meals.scanTitle')}
        hint={t('meals.scanHint')}
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
              <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>{t('meals.importTitle')}</Text>
              <Pressable onPress={() => setImportingMeal(null)}>
                <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 6 }}>{t('meals.importNamePlaceholder')}</Text>
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
                    <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{formatMass(ing.a, system)}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{ing.c} {t('common.kcal')}</Text>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={handleImportMeal}
              disabled={importSaving || !importName.trim()}
              style={[styles.importButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
            >
              {importSaving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
              <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('meals.saveToMyMeals')}</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>

      <PaywallModal
        visible={!!paywallProduct}
        productId={paywallProduct}
        headline={paywallProduct === 'unlimited_meals_favorites' ? t('meals.paywallSaveHeadline') : t('meals.paywallShareHeadline')}
        onClose={() => setPaywallProduct(null)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 15, fontWeight: '700' },
  input: { paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  ingRowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingRowDelete: { paddingLeft: 10 },
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
