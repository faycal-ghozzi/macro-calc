import { useState, useEffect, useRef } from 'react'
import { X, Search, Barcode, Loader2 } from 'lucide-react'
import { FoodItem } from '../types'
import { searchCommonFoods, FOOD_CATEGORIES } from '../lib/commonFoods'
import { fetchProductByBarcode, searchProducts } from '../lib/openfoodfacts'
import BarcodeScanner from './BarcodeScanner'

interface FoodSearchModalProps {
  onSelect: (food: FoodItem) => void
  onClose: () => void
}

export default function FoodSearchModal({ onSelect, onClose }: FoodSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [activeTab, setActiveTab] = useState<'search' | 'barcode'>('search')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (activeTab !== 'search') return
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!query.trim() && !selectedCategory) {
      setResults(searchCommonFoods('').slice(0, 20))
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      const localResults = searchCommonFoods(query)
      const filtered = selectedCategory
        ? localResults.filter((f) => f.category === selectedCategory)
        : localResults

      let apiResults: FoodItem[] = []
      if (query.trim().length >= 2) {
        apiResults = await searchProducts(query)
      }

      // Deduplicate by name
      const seen = new Set(filtered.map((f) => f.name.toLowerCase()))
      const unique = apiResults.filter((f) => !seen.has(f.name.toLowerCase()))
      setResults([...filtered, ...unique])
      setLoading(false)
    }, 400)
  }, [query, selectedCategory, activeTab])

  useEffect(() => {
    setResults(searchCommonFoods('').slice(0, 20))
  }, [])

  async function handleBarcodeSubmit() {
    if (!barcodeInput.trim()) return
    setLoading(true)
    const food = await fetchProductByBarcode(barcodeInput.trim())
    setLoading(false)
    if (food) onSelect(food)
    else alert('Product not found in database. Try searching by name.')
  }

  async function handleScan(barcode: string) {
    setShowScanner(false)
    setLoading(true)
    const food = await fetchProductByBarcode(barcode)
    setLoading(false)
    if (food) onSelect(food)
    else {
      setBarcodeInput(barcode)
      setActiveTab('barcode')
      alert('Product not found. Barcode filled in for manual lookup.')
    }
  }

  if (showScanner) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
  }

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
        {(['search', 'barcode'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-500'
            }`}
          >
            {tab === 'search' ? 'Search Food' : 'By Barcode'}
          </button>
        ))}
      </div>

      {activeTab === 'search' ? (
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
              {loading && <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" />}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !selectedCategory ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
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
              <button
                key={`${food.name}-${i}`}
                onClick={() => onSelect(food)}
                className="w-full text-left bg-gray-900 rounded-2xl p-4 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{food.name}</p>
                    {food.category && (
                      <p className="text-xs text-gray-500 mt-0.5">{food.category} · per 100g</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-emerald-400">{food.calories_100g} kcal</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <span className="text-xs text-blue-400">P {food.protein_100g}g</span>
                  <span className="text-xs text-amber-400">C {food.carbs_100g}g</span>
                  <span className="text-xs text-rose-400">F {food.fat_100g}g</span>
                </div>
              </button>
            ))}
            {results.length === 0 && !loading && query.trim() && (
              <p className="text-center text-gray-500 text-sm py-8">No results found</p>
            )}
          </div>
        </div>
      ) : (
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
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
              className="w-full bg-gray-800 rounded-2xl px-4 py-3.5 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleBarcodeSubmit}
              disabled={loading || !barcodeInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Look Up Product
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
