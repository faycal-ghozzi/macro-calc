import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Utensils, Loader2, X } from 'lucide-react'
import Layout from '../components/Layout'
import FoodSearchModal from '../components/FoodSearchModal'
import AddAmountModal from '../components/AddAmountModal'
import { useMeals } from '../hooks/useMeals'
import { useFoodLog } from '../hooks/useFoodLog'
import { FoodItem, MealIngredient, MealType } from '../types'
import { calcMacrosFromAmount } from '../lib/macroCalc'

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

  // Add to today state
  const [addingMealId, setAddingMealId] = useState<string | null>(null)

  function handleFoodSelect(food: FoodItem) {
    setSelectedFood(food)
    setShowSearch(false)
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
        ...macros,
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

  const buildingTotals = ingredients.reduce(
    (acc, i) => ({ calories: acc.calories + i.calories, protein_g: acc.protein_g + i.protein_g, carbs_g: acc.carbs_g + i.carbs_g, fat_g: acc.fat_g + i.fat_g }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  return (
    <>
      <Layout
        title="Saved Meals"
        headerRight={
          !creatingMeal ? (
            <button
              onClick={() => setCreatingMeal(true)}
              className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl px-3 py-1.5 text-xs font-medium"
            >
              <Plus size={14} />
              New
            </button>
          ) : null
        }
      >
        {/* Create meal panel */}
        {creatingMeal && (
          <div className="bg-gray-900 rounded-3xl p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">New Meal</h3>
              <button onClick={() => { setCreatingMeal(false); setIngredients([]); setMealName('') }} className="text-gray-500 hover:text-white">
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

            {/* Ingredients list */}
            {ingredients.length > 0 && (
              <div className="space-y-2">
                {ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-sm text-white">{ing.food_name}</p>
                      <p className="text-xs text-gray-500">{ing.amount_g}g · {ing.calories} kcal</p>
                    </div>
                    <button onClick={() => setIngredients((prev) => prev.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-4 pt-1 text-xs text-gray-400 px-1">
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
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : meals.length === 0 && !creatingMeal ? (
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
        ) : (
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddToToday(meal.id)}
                          disabled={addingMealId === meal.id}
                          className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {addingMealId === meal.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Today
                        </button>
                        <button onClick={() => deleteMeal(meal.id)} className="text-gray-600 hover:text-red-400 p-1 transition-colors">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => setExpandedMeal(expanded ? null : meal.id)} className="text-gray-600 p-1">
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
    </>
  )
}
