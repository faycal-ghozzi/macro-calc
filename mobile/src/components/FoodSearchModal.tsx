import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { ModalScreen } from './ModalScreen'
import { CameraScannerModal } from './CameraScannerModal'
import { EmptyState } from './EmptyState'
import { useTheme } from '../theme/ThemeProvider'
import { useFavorites } from '../hooks/useFavorites'
import { useMeals } from '../hooks/useMeals'
import { searchCommonFoods, FOOD_CATEGORIES } from '../lib/commonFoods'
import { fetchProductByBarcode, searchProducts } from '../lib/openfoodfacts'
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

function FoodCard({ food, onSelect, isFav, onToggleFav }: {
  food: FoodItem
  onSelect: (food: FoodItem) => void
  isFav: boolean
  onToggleFav: (food: FoodItem) => void
}) {
  const theme = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
      <Pressable style={styles.cardMain} onPress={() => onSelect(food)}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{food.name}</Text>
            {food.category ? (
              <Text style={[styles.cardCategory, { color: theme.colors.textTertiary }]}>{food.category} · per 100g</Text>
            ) : null}
          </View>
          <Text style={[styles.cardKcal, { color: theme.colors.accent }]}>{food.calories_100g} kcal</Text>
        </View>
        <View style={styles.macroRow}>
          <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {food.protein_100g}g</Text>
          <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {food.carbs_100g}g</Text>
          <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {food.fat_100g}g</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onToggleFav(food) }}
        style={[styles.favBtn, { borderLeftColor: theme.colors.cardBorder }]}
      >
        <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? theme.colors.danger : theme.colors.textTertiary} />
      </Pressable>
    </View>
  )
}

export function FoodSearchModal({ visible, onSelect, onClose, onSelectMeal }: FoodSearchModalProps) {
  const theme = useTheme()
  const { favorites, loading: favLoading, isFavorite, toggleFavorite } = useFavorites()
  const { meals, loading: mealsLoading } = useMeals()

  const [activeTab, setActiveTab] = useState<Tab>('favorites')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>(searchCommonFoods('').slice(0, 20))
  const [searching, setSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState<FoodItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible && !favLoading && favorites.length === 0) setActiveTab('search')
  }, [visible, favLoading, favorites.length])

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

  async function handleBarcodeSubmit() {
    if (!barcodeInput.trim()) return
    setBarcodeLoading(true)
    setBarcodeResult(null)
    const food = await fetchProductByBarcode(barcodeInput.trim())
    setBarcodeLoading(false)
    if (food) setBarcodeResult(food)
    else Alert.alert('Not found', 'Product not found in database. Try searching by name.')
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
      Alert.alert('Not found', 'Product not found. Barcode filled in for manual lookup.')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'favorites', label: 'Saved' },
    { id: 'search', label: 'Search' },
    { id: 'barcode', label: 'Barcode' },
    ...(onSelectMeal ? [{ id: 'meals' as Tab, label: 'My Meals' }] : []),
  ]

  return (
    <>
      <ModalScreen visible={visible && !showScanner} title="Add Food" onClose={onClose}>
        <View style={[styles.tabBar, { borderBottomColor: theme.colors.cardBorder }]}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.id) }}
              style={styles.tabButton}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab.id ? theme.colors.accent : theme.colors.textTertiary }}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={[styles.tabUnderline, { backgroundColor: theme.colors.accent }]} />}
            </Pressable>
          ))}
        </View>

        {activeTab === 'favorites' && (
          <FlatList
            data={favorites}
            keyExtractor={(f, i) => f.barcode ?? `${f.name}-${i}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <FoodCard food={item} onSelect={onSelect} isFav={true} onToggleFav={toggleFavorite} />
            )}
            ListEmptyComponent={
              favLoading ? (
                <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
              ) : (
                <EmptyState icon="star-outline" title="No saved foods yet" subtitle="Tap the heart on any food to save it here" />
              )
            }
          />
        )}

        {activeTab === 'search' && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchArea}>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6 }]}>
                <Ionicons name="search" size={17} color={theme.colors.textTertiary} />
                <TextInput
                  autoFocus
                  placeholder="Search foods..."
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
                  <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedCategory ? theme.colors.onAccent : theme.colors.textSecondary }}>All</Text>
                </Pressable>
                {FOOD_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    style={[styles.pill, { backgroundColor: selectedCategory === cat ? theme.colors.accent : theme.colors.backgroundElevated }]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === cat ? theme.colors.onAccent : theme.colors.textSecondary }}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <FlatList
              data={results}
              keyExtractor={(f, i) => `${f.name}-${i}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <FoodCard food={item} onSelect={onSelect} isFav={isFavorite(item)} onToggleFav={toggleFavorite} />
              )}
              ListEmptyComponent={
                !searching && query.trim() ? (
                  <EmptyState icon="search-outline" title="No results found" />
                ) : null
              }
            />
          </View>
        )}

        {activeTab === 'barcode' && (
          <ScrollView contentContainerStyle={styles.barcodeContent}>
            <Pressable
              onPress={() => setShowScanner(true)}
              style={[styles.scanButton, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent + '50', borderRadius: theme.style.cardRadius - 4 }]}
            >
              <Ionicons name="barcode-outline" size={24} color={theme.colors.accent} />
              <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 14 }}>Open Camera Scanner</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />
              <Text style={{ fontSize: 11, color: theme.colors.textTertiary }}>or enter barcode</Text>
              <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />
            </View>

            <TextInput
              placeholder="e.g. 5449000131805"
              placeholderTextColor={theme.colors.textTertiary}
              value={barcodeInput}
              onChangeText={(t) => { setBarcodeInput(t); setBarcodeResult(null) }}
              keyboardType="number-pad"
              style={[styles.barcodeInput, { backgroundColor: theme.colors.backgroundElevated, color: theme.colors.textPrimary, borderRadius: theme.style.cardRadius - 6 }]}
            />
            <Pressable
              onPress={handleBarcodeSubmit}
              disabled={barcodeLoading || !barcodeInput.trim()}
              style={[styles.lookupButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 6, opacity: barcodeLoading || !barcodeInput.trim() ? 0.5 : 1 }]}
            >
              {barcodeLoading ? <ActivityIndicator color={theme.colors.onAccent} /> : (
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 14 }}>Look Up Product</Text>
              )}
            </Pressable>

            {barcodeResult && (
              <View style={{ width: '100%', marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: theme.colors.textTertiary, marginBottom: 8 }}>Found:</Text>
                <FoodCard food={barcodeResult} onSelect={onSelect} isFav={isFavorite(barcodeResult)} onToggleFav={toggleFavorite} />
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'meals' && onSelectMeal && (
          <FlatList
            data={meals}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const totals = (item.ingredients ?? []).reduce(
                (acc, i) => ({ cal: acc.cal + i.calories, p: acc.p + i.protein_g, c: acc.c + i.carbs_g, f: acc.f + i.fat_g }),
                { cal: 0, p: 0, c: 0, f: 0 }
              )
              return (
                <Pressable
                  onPress={() => onSelectMeal(item)}
                  style={[styles.card, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 6, padding: 14 }]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.cardKcal, { color: theme.colors.accent }]}>{Math.round(totals.cal)} kcal</Text>
                  </View>
                  <View style={styles.macroRow}>
                    <Text style={[styles.macroText, { color: theme.colors.protein }]}>P {Math.round(totals.p)}g</Text>
                    <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C {Math.round(totals.c)}g</Text>
                    <Text style={[styles.macroText, { color: theme.colors.fat }]}>F {Math.round(totals.f)}g</Text>
                    <Text style={[styles.macroText, { color: theme.colors.textTertiary }]}>{item.ingredients?.length ?? 0} ingr.</Text>
                  </View>
                </Pressable>
              )
            }}
            ListEmptyComponent={
              mealsLoading ? (
                <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
              ) : (
                <EmptyState icon="book-outline" title="No saved meals yet" subtitle="Create meals on the Meals tab" />
              )
            }
          />
        )}
      </ModalScreen>

      <CameraScannerModal
        visible={showScanner}
        title="Scan Barcode"
        hint="Point camera at a product barcode"
        types={BARCODE_TYPES}
        shape="wide"
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
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
