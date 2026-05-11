import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Utensils, Loader2, X, QrCode, ScanLine } from 'lucide-react'
import Layout from '../components/Layout'
import FoodSearchModal from '../components/FoodSearchModal'
import AddAmountModal from '../components/AddAmountModal'
import MealQRModal from '../components/MealQRModal'
import QRScannerModal from '../components/QRScannerModal'
import { useMeals } from '../hooks/useMeals'
import { useFoodLog } from '../hooks/useFoodLog'
import { FoodItem, Meal, MealIngredient, MealType } from '../types'
import { calcMacrosFromAmount } from '../lib/macroCalc'
import { MealQRData, mealQRToIngredients } from '../lib/mealQR'

type BuildingIngredient = Omit<MealIngredient, 'id' | 'meal_id'>

export default function Meals() {
  const { meals, loading, createMeal, deleteMeal } = useMeals()
  const todayStr = new Date().toISOString().split('T')[0]
  const { addFoodLog } = useFoodLog(todayStr)

  const [creatingMeal, setCreatingMeal] = useState(false)
  const [mealName, setMealName] = useState('')
  const [ingredients, setIngredients] = useState<BuildingIngredient[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [addingMealId, setAddingMealId] = useState<string | null>(null)

  const [qrMeal, setQRMeal] = useState<Meal | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [importingMeal, setImportingMeal] = useState<MealQRData | null>(null)
  const [importName, setImportName] = useState('')
  const [importSaving, setImportSaving] = useState(false)

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, j) => j !== index))
  }

  function handleAmountConfirm(amount: number) {
    if (!selectedFood) return
    const macros = calcMacrosFromAmount(selectedFood, amount)
    setIngredients((prev) => [
      ...prev,
      {
        food_name: selectedFood.name,
        barcode: selectedFood.barcode,
        amount_g: amount,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
      },
    ])
    setSelectedFood(null)
  }

  async function handleSaveMeal() {
    if (!mealName.trim() || ingredients.length === 0) return
    setSaving(true)
    await createMeal(mealName.trim(), ingredients)
    setSaving(false)
    setCreatingMeal(false)
    setMealName('')
    setIngredients([])
  }

  async function handleAddToToday(mealId: string, mealType: MealType = 'lunch') {
    const meal = meals.find((m) => m.id === mealId)
    if (!meal?.ingredients) return
    setAddingMealId(mealId)
    for (const ing of meal.ingredients) {
      await addFoodLog({
        logged_at: todayStr,
        meal_type: mealType,
        food_name: ing.food_name,
        barcode: ing.barcode,
        amount_g: ing.amount_g,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
        fiber_g: ing.fiber_g,
        sugar_g: 0,
      })
    }
    setAddingMealId(null)
  }

  function handleQRScan(data: MealQRData) {
    setShowQRScanner(false)
    setImportingMeal(data)
    setImportName(data.n)
  }

  async function handleImportMeal() {
    if (!importingMeal || !importName.trim()) return
    setImportSaving(true)
    await createMeal(importName.trim(), mealQRToIngredients(importingMeal))
    setImportSaving(false)
    setImportingMeal(null)
    setImportName('')
  }

  const buildingTotals = ingredients.reduce(
    (acc, i) => ({ calories: acc.calories + i.calories, protein_g: acc.protein_g + i.protein_g, carbs_g: acc.carbs_g + i.carbs_g, fat_g: acc.fat_g + i.fat_g }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  const headerRight = creatingMeal ? null : (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowQRScanner(true)}
        className="flex items-center gap-1.5 bg-gray-800 text-gray-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-gray-700 transition-colors"
      >
        <ScanLine size={14} />
        Scan QR
      </button>
      <button
        onClick={() => setCreatingMeal(true)}
        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
      >
        <Plus size={14} />
        New
      </button>
    </div>
  )

  return (
    <>
      <Layout title="Saved Meals" headerRight={headerRight}>
        {/* Create meal panel */}
        {creatingMeal && (
          <div className="bg-gray-900 rounded-3xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">New Meal</h3>
              <button
                onClick={() => { setCreatingMeal(false); setIngredients([]); setMealName('') }}
                className="text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Meal name (e.g. Post-workout)"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
            />

            {ingredients.length > 0 && (
              <div className="space-y-2">
                {ingredients.map((ing, i) => (
                  <div key={`${ing.food_name}-${ing.amount_g}`} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm text-white">{ing.food_name}</p>
                      <p className="text-xs text-gray-500">{ing.amount_g}g · {ing.calories} kcal</p>
                    </div>
                    <button onClick={() => removeIngredient(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-4 pt-1 text-xs px-1">
                  <span className="text-emerald-400 font-semibold">{Math.round(buildingTotals.calories)} kcal</span>
                  <span className="text-blue-400">P {Math.round(buildingTotals.protein_g)}g</span>
                  <span className="text-amber-400">C {Math.round(buildingTotals.carbs_g)}g</span>
                  <span className="text-rose-400">F {Math.round(buildingTotals.fat_g)}g</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-xl py-3 text-sm text-gray-300 font-medium transition-colors"
            >
              <Plus size={16} />
              Add Ingredient
            </button>

            <button
              onClick={handleSaveMeal}
              disabled={saving || !mealName.trim() || ingredients.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Save Meal
            </button>
          </div>
        )}

        {/* Meals list */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        )}
        {!loading && meals.length === 0 && !creatingMeal && (
          <div className="text-center py-16 space-y-3">
            <Utensils size={40} className="text-gray-700 mx-auto" />
            <p className="text-gray-500 text-sm">No saved meals yet</p>
            <button
              onClick={() => setCreatingMeal(true)}
              className="text-emerald-400 text-sm font-medium hover:text-emerald-300"
            >
              Create your first meal
            </button>
          </div>
        )}
        {!loading && meals.length > 0 && (
          <div className="space-y-3">
            {meals.map((meal) => {
              const expanded = expandedMeal === meal.id
              const totals = (meal.ingredients ?? []).reduce(
                (acc, i) => ({ calories: acc.calories + i.calories, protein_g: acc.protein_g + i.protein_g, carbs_g: acc.carbs_g + i.carbs_g, fat_g: acc.fat_g + i.fat_g }),
                { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
              )

              return (
                <div key={meal.id} className="bg-gray-900 rounded-3xl overflow-hidden">
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{meal.name}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="text-xs text-emerald-400 font-semibold">{Math.round(totals.calories)} kcal</span>
                          <span className="text-xs text-blue-400">P {Math.round(totals.protein_g)}g</span>
                          <span className="text-xs text-amber-400">C {Math.round(totals.carbs_g)}g</span>
                          <span className="text-xs text-rose-400">F {Math.round(totals.fat_g)}g</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAddToToday(meal.id)}
                          disabled={addingMealId === meal.id}
                          className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {addingMealId === meal.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Today
                        </button>
                        <button
                          onClick={() => setQRMeal(meal)}
                          className="text-gray-500 hover:text-emerald-400 p-1.5 transition-colors"
                          aria-label="Share via QR"
                        >
                          <QrCode size={16} />
                        </button>
                        <button onClick={() => deleteMeal(meal.id)} className="text-gray-600 hover:text-red-400 p-1.5 transition-colors">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => setExpandedMeal(expanded ? null : meal.id)} className="text-gray-600 p-1.5">
                          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded && meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="border-t border-gray-800">
                      {meal.ingredients.map((ing) => (
                        <div key={ing.id} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-800/50 last:border-0">
                          <div>
                            <p className="text-sm text-white">{ing.food_name}</p>
                            <p className="text-xs text-gray-500">{ing.amount_g}g</p>
                          </div>
                          <span className="text-sm text-gray-400">{Math.round(ing.calories)} kcal</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Layout>

      {showSearch && (
        <FoodSearchModal
          onSelect={handleFoodSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      {selectedFood && (
        <AddAmountModal
          food={selectedFood}
          onConfirm={handleAmountConfirm}
          onBack={() => { setSelectedFood(null); setShowSearch(true) }}
        />
      )}

      {qrMeal && (
        <MealQRModal meal={qrMeal} onClose={() => setQRMeal(null)} />
      )}

      {showQRScanner && (
        <QRScannerModal onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />
      )}

      {/* Import meal dialog */}
      {importingMeal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl px-5 pt-5 pb-10 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-white">Import Meal</h2>
              <button
                onClick={() => setImportingMeal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1 shrink-0">
              <label htmlFor="import-name" className="text-xs text-gray-500">Meal name — rename or keep as is</label>
              <input
                id="import-name"
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
              <p className="text-xs text-gray-500">{importingMeal.i.length} ingredient{importingMeal.i.length === 1 ? '' : 's'}</p>
              {importingMeal.i.map((ing) => (
                <div key={`${ing.n}-${ing.a}`} className="flex justify-between items-center bg-gray-800 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm text-white">{ing.n}</p>
                    <p className="text-xs text-gray-500">{ing.a}g</p>
                  </div>
                  <span className="text-xs text-gray-400">{ing.c} kcal</span>
                </div>
              ))}
            </div>

            <div className="shrink-0 pt-1">
              <button
                onClick={handleImportMeal}
                disabled={importSaving || !importName.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-2xl py-4 text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {importSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save to My Meals
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
