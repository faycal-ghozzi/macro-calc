import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Flame } from 'lucide-react'
import Layout from '../components/Layout'
import FoodSearchModal from '../components/FoodSearchModal'
import AddAmountModal from '../components/AddAmountModal'
import ExerciseModal from '../components/ExerciseModal'
import { useFoodLog } from '../hooks/useFoodLog'
import { useExerciseLog } from '../hooks/useExerciseLog'
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
  const { logs: exerciseLogs, totalBurned, addExerciseLog, deleteExerciseLog } = useExerciseLog(dateStr)

  const [activeMeal, setActiveMeal] = useState<MealType | null>(initialMeal)
  const [showSearch, setShowSearch] = useState(!!initialMeal)
  const [showExercise, setShowExercise] = useState(false)
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
  const netCals = totalCals - totalBurned

  return (
    <>
      <Layout title={dateStr === todayStr ? "Today's Log" : dateStr}>
        {/* Daily summary bar */}
        <div className="mb-4 bg-gray-900 rounded-2xl p-4">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-xs text-gray-500">Eaten</p>
              <p className="text-base font-bold text-white">{Math.round(totalCals)}</p>
            </div>
            {totalBurned > 0 && (
              <>
                <span className="text-gray-700 text-lg">−</span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Burned</p>
                  <p className="text-base font-bold text-orange-400">{Math.round(totalBurned)}</p>
                </div>
                <span className="text-gray-700 text-lg">=</span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Net</p>
                  <p className="text-base font-bold text-emerald-400">{Math.round(netCals)}</p>
                </div>
              </>
            )}
            {totalBurned === 0 && (
              <p className="text-xs text-gray-600">kcal</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Meal sections */}
          {mealTypes.map((meal) => {
            const items = byMeal(meal)
            const mealCals = items.reduce((s, i) => s + i.calories, 0)
            const mealProt = items.reduce((s, i) => s + i.protein_g, 0)

            return (
              <div key={meal} className="bg-gray-900 rounded-3xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => setActiveMeal(activeMeal === meal ? null : meal)}
                  >
                    <span className="text-xl">{MEAL_ICONS[meal]}</span>
                    <div>
                      <p className="text-sm font-semibold text-white capitalize">{meal}</p>
                      {items.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {Math.round(mealCals)} kcal · {Math.round(mealProt)}g protein
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddClick(meal)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {items.length > 0 && (
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
                          <button onClick={() => deleteFoodLog(item.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
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

          {/* Exercise section */}
          <div className="bg-gray-900 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-sm font-semibold text-white">Exercise</p>
                  {totalBurned > 0 && (
                    <p className="text-xs text-orange-400">{Math.round(totalBurned)} kcal burned</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowExercise(true)}
                className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-orange-500/20 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {exerciseLogs.length > 0 && (
              <div className="border-t border-gray-800">
                {exerciseLogs.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ex.name}</p>
                      {ex.duration_min && <p className="text-xs text-gray-500">{ex.duration_min} min</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Flame size={13} className="text-orange-400" />
                        <p className="text-sm font-semibold text-orange-400">{Math.round(ex.calories_burned)}</p>
                      </div>
                      <button onClick={() => deleteExerciseLog(ex.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {showExercise && (
        <ExerciseModal
          onAdd={async (entry) => { await addExerciseLog({ ...entry, logged_at: dateStr }) }}
          onClose={() => setShowExercise(false)}
        />
      )}
    </>
  )
}
