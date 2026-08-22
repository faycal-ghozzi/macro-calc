import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Meal, MealIngredient } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { calcMealTotals } from '../lib/macroCalc'

interface MealsContextType {
  meals: Meal[]
  loading: boolean
  fetchError: string | null
  createMeal: (name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) => Promise<{ error: Error | null; meal?: Meal }>
  updateMeal: (id: string, name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) => Promise<{ error: Error | null }>
  deleteMeal: (id: string) => Promise<{ error: Error | null }>
  touchMealUsed: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

// Ingredient objects can carry extra macro fields (e.g. sugar_g, computed
// alongside the rest for food log entries) that meal_ingredients has no
// column for - inserting them raw makes Supabase reject the whole row.
function toMealIngredientRow(i: Omit<MealIngredient, 'id' | 'meal_id'>, meal_id: string) {
  return {
    meal_id,
    food_name: i.food_name,
    barcode: i.barcode,
    amount_g: i.amount_g,
    calories: i.calories,
    protein_g: i.protein_g,
    carbs_g: i.carbs_g,
    fat_g: i.fat_g,
    fiber_g: i.fiber_g,
  }
}

const MealsContext = createContext<MealsContextType>({
  meals: [],
  loading: true,
  fetchError: null,
  createMeal: async () => ({ error: new Error('Not logged in') }),
  updateMeal: async () => ({ error: new Error('Not logged in') }),
  deleteMeal: async () => ({ error: new Error('Not logged in') }),
  touchMealUsed: async () => {},
  refetch: async () => {},
})

// Fetched once here and shared via context, rather than every screen/modal
// that calls useMeals() re-fetching independently.
export function MealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchMeals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setFetchError(null)
    const { data: mealsData, error } = await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (error) {
      setFetchError(error.message)
      setLoading(false)
      return
    }

    const enriched = (mealsData ?? []).map((m: Meal & { meal_ingredients: MealIngredient[] }) => ({
      ...m,
      ingredients: m.meal_ingredients ?? [],
      ...calcMealTotals(m.meal_ingredients ?? []),
    }))
    setMeals(enriched)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setMeals([]); setLoading(false); return }
    fetchMeals()
  }, [user, fetchMeals])

  const createMeal = useCallback(async (name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) => {
    if (!user) return { error: new Error('Not logged in') }
    const { data: meal, error: mealErr } = await supabase
      .from('meals')
      .insert({ user_id: user.id, name })
      .select()
      .single()
    if (mealErr || !meal) return { error: mealErr }

    if (ingredients.length > 0) {
      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredients.map((i) => toMealIngredientRow(i, meal.id)))
      if (ingErr) {
        // Don't leave an orphaned, ingredient-less meal behind if this half fails.
        await supabase.from('meals').delete().eq('id', meal.id)
        return { error: ingErr }
      }
    }

    await fetchMeals()
    return { error: null, meal }
  }, [user, fetchMeals])

  const updateMeal = useCallback(async (id: string, name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) => {
    if (!user) return { error: new Error('Not logged in') }
    const { error: nameErr } = await supabase.from('meals').update({ name }).eq('id', id)
    if (nameErr) return { error: nameErr }

    const { error: delErr } = await supabase.from('meal_ingredients').delete().eq('meal_id', id)
    if (delErr) return { error: delErr }

    if (ingredients.length > 0) {
      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredients.map((i) => toMealIngredientRow(i, id)))
      if (ingErr) return { error: ingErr }
    }

    await fetchMeals()
    return { error: null }
  }, [user, fetchMeals])

  const deleteMeal = useCallback(async (id: string) => {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals((prev) => prev.filter((m) => m.id !== id))
    return { error }
  }, [])

  const touchMealUsed = useCallback(async (id: string) => {
    await supabase.from('meals').update({ last_used_at: new Date().toISOString() }).eq('id', id)
  }, [])

  const value = useMemo(
    () => ({ meals, loading, fetchError, createMeal, updateMeal, deleteMeal, touchMealUsed, refetch: fetchMeals }),
    [meals, loading, fetchError, createMeal, updateMeal, deleteMeal, touchMealUsed, fetchMeals]
  )

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
}

export const useMeals = () => useContext(MealsContext)
