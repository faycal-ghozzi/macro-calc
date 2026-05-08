import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Meal, MealIngredient } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { calcMealTotals } from '../lib/macroCalc'

export function useMeals() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setMeals([]); setLoading(false); return }
    fetchMeals()
  }, [user])

  async function fetchMeals() {
    if (!user) return
    setLoading(true)
    const { data: mealsData } = await supabase
      .from('meals')
      .select('*, meal_ingredients(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const enriched = (mealsData ?? []).map((m: Meal & { meal_ingredients: MealIngredient[] }) => ({
      ...m,
      ingredients: m.meal_ingredients ?? [],
      ...calcMealTotals(m.meal_ingredients ?? []),
    }))
    setMeals(enriched)
    setLoading(false)
  }

  async function createMeal(name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) {
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
        .insert(ingredients.map((i) => ({ ...i, meal_id: meal.id })))
      if (ingErr) return { error: ingErr }
    }

    await fetchMeals()
    return { error: null, meal }
  }

  async function deleteMeal(id: string) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals((prev) => prev.filter((m) => m.id !== id))
    return { error }
  }

  return { meals, loading, createMeal, deleteMeal, refetch: fetchMeals }
}
