import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import FoodSearchModal from '../components/FoodSearchModal'
import AddAmountModal from '../components/AddAmountModal'
import { useFoodLog } from '../hooks/useFoodLog'
import { FoodItem, MealType } from '../types'
import { calcMacrosFromAmount } from '../lib/macroCalc'

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function FoodLog() {
  const [searchParams] = useSearchParams()
  const todayStr = new Date().toISOString().split('T')[0]
  const dateStr = searchParams.get('date') || todayStr
  const initialMeal = (searchParams.get('meal') as MealType) || null

  const { logs, byMeal, addFoodLog, deleteFoodLog } = useFoodLog(dateStr)
  const [activeMeal, setActiveMeal] = useState<MealType | null>(initialMeal)
  const [showSearch, setShowSearch] = useState(!!initialMeal)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [pendingMeal, setPendingMeal] = useState<MealType | null>(initialMeal)

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

  function handleAddClick(meal: MealType) {
    setActiveMeal(meal)
    setPendingMeal(meal)
    setSelectedFood(null)
    setShowSearch(true)
  }

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
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

  const totalCals = logs.reduce((s, l) => s + l.calories, 0)

  return (
    <>
      <Layout title={dateStr === todayStr ? "Today's Log" : dateStr}>
        <div className="mb-4 bg-gray-900 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-sm text-gray-400">Total today</span>
          <span className="text-lg font-bold text-emerald-400">{Math.round(totalCals)} kcal</span>
        </div>

        <div className="space-y-4">
          {mealTypes.map((meal) => {
            const items = byMeal(meal)
            const mealCals = items.reduce((s, i) => s + i.calories, 0)
            const mealProt = items.reduce((s, i) => s + i.protein_g, 0)

            return (
              <div key={meal} className="bg-gray-900 rounded-3xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() => setActiveMeal(activeMeal === meal ? null : meal)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{MEAL_ICONS[meal]}</span>
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{meal}</p>
                      {items.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {Math.round(mealCals)} kcal · {Math.round(mealProt)}g protein
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddClick(meal) }}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {(activeMeal === meal || items.length > 0) && items.length > 0 && (
                  <div className="border-t border-gray-800">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.food_name}</p>
                          <p className="text-xs text-gray-500">{item.amount_g}g</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{Math.round(item.calories)}</p>
                            <div className="flex gap-1.5 justify-end">
                              <span className="text-[10px] text-blue-400">P{item.protein_g}g</span>
                              <span className="text-[10px] text-amber-400">C{item.carbs_g}g</span>
                              <span className="text-[10px] text-rose-400">F{item.fat_g}g</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteFoodLog(item.id)}
                            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Layout>

      {showSearch && (
        <FoodSearchModal
          onSelect={handleFoodSelect}
          onClose={() => { setShowSearch(false); setActiveMeal(null) }}
        />
      )}

      {selectedFood && pendingMeal && (
        <AddAmountModal
          food={selectedFood}
          onConfirm={handleAmountConfirm}
          onBack={() => { setSelectedFood(null); setShowSearch(true) }}
        />
      )}
    </>
  )
}
