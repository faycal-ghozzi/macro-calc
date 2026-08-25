import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useTranslation } from 'react-i18next'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { CameraScannerModal } from './CameraScannerModal'
import { EmptyState } from './EmptyState'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'
import { PaywallModal } from './PaywallModal'
import { useTheme } from '../theme/ThemeProvider'
import { useFavorites } from '../hooks/useFavorites'
import { useMeals } from '../hooks/useMeals'
import { useEntitlements } from '../hooks/useEntitlements'
import { useTour, TourTarget, EMPTY_SEEN_TIPS } from '../contexts/TourContext'
import { useProfile } from '../hooks/useProfile'
import { searchCommonFoods, FOOD_CATEGORIES, categoryLabelKey } from '../lib/commonFoods'
import { fetchProductByBarcode, searchProducts } from '../lib/openfoodfacts'
import { calcMealTotals } from '../lib/macroCalc'
import { mirrorChevron } from '../lib/rtl'
import { useUnitsStore } from '../store/useUnitsStore'
import { formatMass } from '../lib/units'
import type { FoodItem, Meal } from '../types'
import type { CodeFormat } from 'react-native-camera-kit'

// Stable reference: recreating this array on every render would tear down
// and rebuild the barcode scanner output, stalling live detection.
const BARCODE_TYPES: CodeFormat[] = ['ean-13', 'ean-8', 'upc-a', 'upc-e']

interface FoodSearchModalProps {
  visible: boolean
  onSelect: (food: FoodItem) => void
  onClose: () => void
  onSelectMeal?: (meal: Meal) => void
}

type Tab = 'favorites' | 'search' | 'barcode' | 'meals'

function FoodCard({ food, onSelect, isFav, onToggleFav, highlightFavButton }: {
  food: FoodItem
  onSelect: (food: FoodItem) => void
  isFav: boolean
  onToggleFav: (food: FoodItem) => void
  highlightFavButton?: boolean
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { system } = useUnitsStore()
  const favButton = (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onToggleFav(food) }}
      style={[styles.favBtn, { borderLeftColor: theme.colors.cardBorder }]}
    >
      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? theme.colors.danger : theme.colors.textTertiary} />
    </Pressable>
  )
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
      <Pressable style={styles.cardMain} onPress={() => onSelect(food)}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{food.name}</Text>
            {food.category ? (
              <Text style={[styles.cardCategory, { color: theme.colors.textTertiary }]}>{t('food.perCategoryAmount', { category: t(categoryLabelKey(food.category)), amount: formatMass(100, system) })}</Text>
            ) : null}
          </View>
          <Text style={[styles.cardKcal, { color: theme.colors.accent }]}>{food.calories_100g} {t('common.kcal')}</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {formatMass(food.protein_100g, system)}</Text>
          <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {formatMass(food.carbs_100g, system)}</Text>
          <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {formatMass(food.fat_100g, system)}</Text>
        </View>
      </Pressable>
      {highlightFavButton ? (
        <TourTarget id="tip_fav_heart" style={{ alignSelf: 'stretch', justifyContent: 'center' }}>{favButton}</TourTarget>
      ) : favButton}
    </View>
  )
}

function MealCard({ meal, onSelect, expanded, onToggleExpand }: {
  meal: Meal
  onSelect: (meal: Meal) => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { system } = useUnitsStore()
  const totals = calcMealTotals(meal.ingredients ?? [])
  const ingredientCount = meal.ingredients?.length ?? 0

  return (
    <View style={[styles.mealCard, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
      <View style={styles.card}>
        <Pressable style={styles.cardMain} onPress={() => onSelect(meal)}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{meal.name}</Text>
              <Text style={[styles.cardCategory, { color: theme.colors.textTertiary }]}>{t('food.ingredientCount', { count: ingredientCount })}</Text>
            </View>
            <Text style={[styles.cardKcal, { color: theme.colors.accent }]}>{Math.round(totals.calories)} {t('common.kcal')}</Text>
          </View>
          <View style={styles.macroRow}>
            <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {formatMass(totals.protein_g, system)}</Text>
            <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {formatMass(totals.carbs_g, system)}</Text>
            <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {formatMass(totals.fat_g, system)}</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); onToggleExpand() }}
          style={[styles.expandBtn, { borderLeftColor: theme.colors.cardBorder }]}
        >
          <Ionicons name={mirrorChevron(expanded ? 'chevron-up' : 'chevron-down')} size={18} color={theme.colors.textTertiary} />
        </Pressable>
      </View>
      {expanded && ingredientCount > 0 && (
        <View>
          {meal.ingredients!.map((ing) => (
            <View key={ing.id} style={[styles.ingredientRow, { borderTopColor: theme.colors.cardBorder }]}>
              <Text style={[styles.ingredientName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{ing.food_name}</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textTertiary }}>{formatMass(ing.amount_g, system)} · {Math.round(ing.calories)} {t('common.kcal')}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export function FoodSearchModal({ visible, onSelect, onClose, onSelectMeal }: FoodSearchModalProps) {
  const theme = useTheme()
  const { t } = useTranslation()
  const { favorites, loading: favLoading, fetchError: favError, isFavorite, toggleFavorite, touchFavoriteUsed, refetch: refetchFavorites } = useFavorites()
  const { meals, loading: mealsLoading, fetchError: mealsError, refetch: refetchMeals } = useMeals()
  const { checkAndIncrementFavoriteCreated } = useEntitlements()
  const [favoritePaywall, setFavoritePaywall] = useState(false)
  const { showTip } = useTour()
  const { profile } = useProfile()
  const seenFeatureTips = profile?.seen_feature_tips ?? EMPTY_SEEN_TIPS

  const [activeTab, setActiveTab] = useState<Tab>('favorites')
  const [favoriteQuery, setFavoriteQuery] = useState('')
  const [mealQuery, setMealQuery] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>(searchCommonFoods('').slice(0, 20))
  const [searching, setSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState<FoodItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible && !favLoading && favorites.length === 0) setActiveTab('search')
  }, [visible, favLoading, favorites.length])

  const barcodeTipAttempted = useRef(false)
  useEffect(() => {
    if (!visible || activeTab !== 'barcode' || seenFeatureTips.tip_barcode_scan || barcodeTipAttempted.current) return
    barcodeTipAttempted.current = true
    showTip('tip_barcode_scan', { title: t('tour.tipBarcodeScanTitle'), body: t('tour.tipBarcodeScanBody') })
  }, [visible, activeTab, seenFeatureTips, showTip, t])

  const favHeartTipAttempted = useRef(false)
  useEffect(() => {
    if (!visible || activeTab !== 'search' || results.length === 0 || seenFeatureTips.tip_fav_heart || favHeartTipAttempted.current) return
    favHeartTipAttempted.current = true
    showTip('tip_fav_heart', { title: t('tour.tipFavHeartTitle'), body: t('tour.tipFavHeartBody') })
  }, [visible, activeTab, results.length, seenFeatureTips, showTip, t])

  useEffect(() => {
    if (activeTab !== 'search') return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!query.trim() && !selectedCategory) {
      setResults(searchCommonFoods('').slice(0, 20))
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      const local = searchCommonFoods(query)
      const filtered = selectedCategory ? local.filter((f) => f.category === selectedCategory) : local

      let apiResults: FoodItem[] = []
      if (query.trim().length >= 2) apiResults = await searchProducts(query)

      const seen = new Set(filtered.map((f) => f.name.toLowerCase()))
      setResults([...filtered, ...apiResults.filter((f) => !seen.has(f.name.toLowerCase()))])
      setSearching(false)
    }, 400)
  }, [query, selectedCategory, activeTab])

  function handleSelectFood(food: FoodItem) {
    if (isFavorite(food)) touchFavoriteUsed(food)
    onSelect(food)
  }

  async function handleToggleFav(food: FoodItem) {
    if (isFavorite(food)) { await toggleFavorite(food); return }
    const allowed = await checkAndIncrementFavoriteCreated()
    if (!allowed) { setFavoritePaywall(true); return }
    await toggleFavorite(food)
  }

  async function handleBarcodeSubmit() {
    if (!barcodeInput.trim()) return
    setBarcodeLoading(true)
    setBarcodeResult(null)
    const food = await fetchProductByBarcode(barcodeInput.trim())
    setBarcodeLoading(false)
    if (food) setBarcodeResult(food)
    else Alert.alert(t('common.notFoundTitle'), t('food.notFoundInDatabase'))
  }

  async function handleScan(barcode: string) {
    setShowScanner(false)
    setBarcodeLoading(true)
    setBarcodeResult(null)
    setActiveTab('barcode')
    const food = await fetchProductByBarcode(barcode)
    setBarcodeLoading(false)
    if (food) setBarcodeResult(food)
    else {
      setBarcodeInput(barcode)
      Alert.alert(t('common.notFoundTitle'), t('food.notFoundManualLookup'))
    }
  }

  const tabs: { id: Tab; labelKey: string }[] = [
    { id: 'favorites', labelKey: 'food.tabSaved' },
    { id: 'search', labelKey: 'food.tabSearch' },
    { id: 'barcode', labelKey: 'food.tabBarcode' },
    ...(onSelectMeal ? [{ id: 'meals' as Tab, labelKey: 'food.tabMyMeals' }] : []),
  ]

  const filteredFavorites = favoriteQuery.trim()
    ? favorites.filter((f) => f.name.toLowerCase().includes(favoriteQuery.trim().toLowerCase()))
    : favorites
  const filteredMeals = mealQuery.trim()
    ? meals.filter((m) => m.name.toLowerCase().includes(mealQuery.trim().toLowerCase()))
    : meals

  return (
    <>
      <ModalScreen visible={visible && !showScanner} title={t('food.addFoodTitle')} onClose={onClose}>
        <View style={[styles.tabBar, { borderBottomColor: theme.colors.cardBorder }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.id) }}
              style={styles.tabButton}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab.id ? theme.colors.accent : theme.colors.textTertiary }}>
                {t(tab.labelKey)}
              </Text>
              {activeTab === tab.id && <View style={[styles.tabUnderline, { backgroundColor: theme.colors.accent }]} />}
            </Pressable>
          ))}
        </View>

        {activeTab === 'favorites' && (
          <View style={{ flex: 1 }}>
            {favorites.length > 0 && (
              <View style={styles.searchArea}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                  <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
                  <TextInput
                    placeholder={t('food.searchFavoritesPlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={favoriteQuery}
                    onChangeText={setFavoriteQuery}
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                  />
                </View>
              </View>
            )}
            <FlatList
              data={filteredFavorites}
              keyExtractor={(f, i) => f.barcode ?? `${f.name}-${i}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <FoodCard food={item} onSelect={handleSelectFood} isFav={true} onToggleFav={handleToggleFav} />
              )}
              ListEmptyComponent={
                favLoading ? (
                  <LoadingState minHeight={200} />
                ) : favError ? (
                  <ErrorState message={t('food.loadFavoritesError')} onRetry={refetchFavorites} />
                ) : favoriteQuery.trim() ? (
                  <EmptyState icon="search-outline" title={t('food.noResultsTitle')} />
                ) : (
                  <EmptyState icon="heart-outline" title={t('food.emptyFavoritesTitle')} subtitle={t('food.emptyFavoritesSubtitle')} />
                )
              }
            />
          </View>
        )}

        {activeTab === 'search' && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchArea}>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
                <TextInput
                  autoFocus
                  placeholder={t('food.searchPlaceholder')}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={query}
                  onChangeText={setQuery}
                  style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                />
                {searching && <ActivityIndicator size="small" color={theme.colors.accent} />}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <Pressable
                  onPress={() => setSelectedCategory(null)}
                  style={[styles.pill, { backgroundColor: !selectedCategory ? theme.colors.accent : theme.colors.backgroundElevated }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedCategory ? theme.colors.onAccent : theme.colors.textSecondary }}>{t('common.all')}</Text>
                </Pressable>
                {FOOD_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    style={[styles.pill, { backgroundColor: selectedCategory === cat ? theme.colors.accent : theme.colors.backgroundElevated }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === cat ? theme.colors.onAccent : theme.colors.textSecondary }}>{t(categoryLabelKey(cat))}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <FlatList
              data={results}
              keyExtractor={(f, i) => `${f.name}-${i}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <FoodCard
                  food={item}
                  onSelect={handleSelectFood}
                  isFav={isFavorite(item)}
                  onToggleFav={handleToggleFav}
                  highlightFavButton={index === 0}
                />
              )}
              ListEmptyComponent={
                !searching && query.trim() ? (
                  <EmptyState icon="search-outline" title={t('food.noResultsTitle')} />
                ) : null
              }
            />
          </View>
        )}

        {activeTab === 'barcode' && (
          <ScrollView contentContainerStyle={styles.barcodeContent}>
            <TourTarget id="tip_barcode_scan" style={{ alignSelf: 'stretch' }}>
              <Pressable
                onPress={() => setShowScanner(true)}
                style={[styles.scanButton, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent + '50', borderRadius: theme.style.cardRadius - 4 }]}
              >
                <Ionicons name="barcode-outline" size={24} color={theme.colors.accent} />
                <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 14 }}>{t('food.openCameraScanner')}</Text>
              </Pressable>
            </TourTarget>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>{t('food.orEnterBarcode')}</Text>
              <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />
            </View>

            <TextInput
              placeholder={t('food.barcodePlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              value={barcodeInput}
              onChangeText={(v) => { setBarcodeInput(v); setBarcodeResult(null) }}
              keyboardType="number-pad"
              style={[styles.barcodeInput, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
            />
            <Pressable
              onPress={handleBarcodeSubmit}
              disabled={barcodeLoading || !barcodeInput.trim()}
              style={[styles.lookupButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 6, opacity: barcodeLoading || !barcodeInput.trim() ? 0.5 : 1 }]}
            >
              {barcodeLoading ? <ActivityIndicator color={theme.colors.onAccent} /> : (
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>{t('food.lookUpProduct')}</Text>
              )}
            </Pressable>

            {barcodeResult && (
              <View style={{ width: '100%', marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 8 }}>{t('common.found')}</Text>
                <FoodCard food={barcodeResult} onSelect={handleSelectFood} isFav={isFavorite(barcodeResult)} onToggleFav={handleToggleFav} />
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'meals' && onSelectMeal && (
          <View style={{ flex: 1 }}>
            {meals.length > 0 && (
              <View style={styles.searchArea}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                  <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
                  <TextInput
                    placeholder={t('meals.searchPlaceholder')}
                    placeholderTextColor={theme.colors.textTertiary}
                    value={mealQuery}
                    onChangeText={setMealQuery}
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                  />
                </View>
              </View>
            )}
            <FlatList
              data={filteredMeals}
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <MealCard
                  meal={item}
                  onSelect={onSelectMeal}
                  expanded={expandedMealId === item.id}
                  onToggleExpand={() => setExpandedMealId((prev) => (prev === item.id ? null : item.id))}
                />
              )}
              ListEmptyComponent={
                mealsLoading ? (
                  <LoadingState minHeight={200} />
                ) : mealsError ? (
                  <ErrorState message={t('food.loadMealsError')} onRetry={refetchMeals} />
                ) : mealQuery.trim() ? (
                  <EmptyState icon="search-outline" title={t('food.noResultsTitle')} />
                ) : (
                  <EmptyState icon="book-outline" title={t('food.emptyMealsTitle')} subtitle={t('food.emptyMealsSubtitle')} />
                )
              }
            />
          </View>
        )}
      </ModalScreen>

      <CameraScannerModal
        visible={showScanner}
        title={t('food.scanBarcodeTitle')}
        hint={t('food.scanBarcodeHint')}
        types={BARCODE_TYPES}
        shape="wide"
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />

      <PaywallModal
        visible={favoritePaywall}
        productId="unlimited_meals_favorites"
        headline={t('food.paywallFavoritesHeadline')}
        onClose={() => setFavoritePaywall(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabUnderline: { height: 2, width: '60%', borderRadius: 1, marginTop: 8 },
  listContent: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', overflow: 'hidden' },
  cardMain: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  cardCategory: { fontSize: 11, marginTop: 2 },
  cardKcal: { fontSize: 13, fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  macroText: { fontSize: 11, fontWeight: '600' },
  favBtn: { width: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth },
  mealCard: { overflow: 'hidden' },
  expandBtn: { width: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  ingredientName: { fontSize: 13, flexShrink: 1 },
  searchArea: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginRight: 8 },
  barcodeContent: { padding: 16, alignItems: 'center', gap: 16 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', paddingVertical: 20, borderWidth: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  barcodeInput: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 },
  lookupButton: { width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
})
