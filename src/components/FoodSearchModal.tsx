import { useState, useEffect, useRef } from 'react'
import { X, Search, Barcode, Loader2, Heart, Star } from 'lucide-react'
import { FoodItem } from '../types'
import { searchCommonFoods, FOOD_CATEGORIES } from '../lib/commonFoods'
import { fetchProductByBarcode, searchProducts } from '../lib/openfoodfacts'
import { useFavorites } from '../hooks/useFavorites'
import BarcodeScanner from './BarcodeScanner'

interface FoodSearchModalProps {
  onSelect: (food: FoodItem) => void
  onClose: () => void
}

type Tab = 'favorites' | 'search' | 'barcode'

interface FoodCardProps {
  food: FoodItem
  onSelect: (food: FoodItem) => void
  isFav: boolean
  onToggleFav: (food: FoodItem) => void
}

function FoodCard({ food, onSelect, isFav, onToggleFav }: Readonly<FoodCardProps>) {
  const heartColorClass = isFav ? 'text-rose-400 hover:text-rose-300' : 'text-gray-600 hover:text-rose-400'
  return (
    <div className="flex items-stretch bg-gray-900 rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors">
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="flex-1 text-left p-4 min-w-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{food.name}</p>
            {food.category && (
              <p className="text-xs text-gray-500 mt-0.5">{food.category} · per 100g</p>
            )}
          </div>
          <p className="text-sm font-bold text-emerald-400 shrink-0">{food.calories_100g} kcal</p>
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-xs text-blue-400">P {food.protein_100g}g</span>
          <span className="text-xs text-amber-400">C {food.carbs_100g}g</span>
          <span className="text-xs text-rose-400">F {food.fat_100g}g</span>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFav(food) }}
        className={`px-3 flex items-center border-l border-gray-800 transition-colors ${heartColorClass}`}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart size={17} fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export default function FoodSearchModal({ onSelect, onClose }: Readonly<FoodSearchModalProps>) {
  const { favorites, loading: favLoading, isFavorite, toggleFavorite } = useFavorites()

  const [activeTab, setActiveTab] = useState<Tab>('favorites')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [searching, setSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeResult, setBarcodeResult] = useState<FoodItem | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Switch to Search tab on first open if no favorites yet
  useEffect(() => {
    if (!favLoading && favorites.length === 0) setActiveTab('search')
  }, [favLoading, favorites.length])

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

  useEffect(() => {
    setResults(searchCommonFoods('').slice(0, 20))
  }, [])

  async function handleBarcodeSubmit() {
    if (!barcodeInput.trim()) return
    setBarcodeLoading(true)
    setBarcodeResult(null)
    const food = await fetchProductByBarcode(barcodeInput.trim())
    setBarcodeLoading(false)
    if (food) setBarcodeResult(food)
    else alert('Product not found in database. Try searching by name.')
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
      alert('Product not found. Barcode filled in for manual lookup.')
    }
  }

  function handleSelect(food: FoodItem) {
    onSelect(food)
  }

  if (showScanner) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'favorites', label: '⭐ Saved' },
    { id: 'search', label: 'Search' },
    { id: 'barcode', label: 'Barcode' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Add Food</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FAVORITES TAB ── */}
      {activeTab === 'favorites' && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-2">
          {favLoading && (
            <div className="flex justify-center py-12">
              <Loader2 size={22} className="animate-spin text-emerald-400" />
            </div>
          )}
          {!favLoading && favorites.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <Star size={40} className="text-gray-700 mx-auto" />
              <p className="text-gray-500 text-sm">No saved foods yet</p>
              <p className="text-gray-600 text-xs">
                Tap the <Heart size={11} className="inline text-gray-600" /> on any food to save it here
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="text-emerald-400 text-sm font-medium"
              >
                Browse foods →
              </button>
            </div>
          )}
          {!favLoading && favorites.length > 0 && (
            <>
              <p className="text-xs text-gray-500 px-1 pb-1">{favorites.length} saved food{favorites.length === 1 ? '' : 's'}</p>
              {favorites.map((food) => (
                <FoodCard
                  key={food.barcode ?? food.name}
                  food={food}
                  onSelect={handleSelect}
                  isFav={true}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── SEARCH TAB ── */}
      {activeTab === 'search' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 bg-gray-800 rounded-2xl px-4 py-3">
              <Search size={18} className="text-gray-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search foods..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
              />
              {searching && <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" />}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory ? 'bg-gray-800 text-gray-400' : 'bg-emerald-500 text-white'
                }`}
              >
                All
              </button>
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
            {results.map((food, i) => (
              <FoodCard
                key={`${food.name}-${i}`}
                food={food}
                onSelect={handleSelect}
                isFav={isFavorite(food)}
                onToggleFav={toggleFavorite}
              />
            ))}
            {results.length === 0 && !searching && query.trim() && (
              <p className="text-center text-gray-500 text-sm py-8">No results found</p>
            )}
          </div>
        </div>
      )}

      {/* ── BARCODE TAB ── */}
      {activeTab === 'barcode' && (
        <div className="flex-1 flex flex-col p-4 gap-4">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-3 w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl py-5 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Barcode size={22} />
            Open Camera Scanner
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">or enter barcode</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 5449000131805"
              value={barcodeInput}
              onChange={(e) => { setBarcodeInput(e.target.value); setBarcodeResult(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
              className="w-full bg-gray-800 rounded-2xl px-4 py-3.5 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleBarcodeSubmit}
              disabled={barcodeLoading || !barcodeInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {barcodeLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Look Up Product
            </button>
          </div>

          {/* Found product card */}
          {barcodeResult && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 px-1">Found:</p>
              <FoodCard
                food={barcodeResult}
                onSelect={handleSelect}
                isFav={isFavorite(barcodeResult)}
                onToggleFav={toggleFavorite}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
