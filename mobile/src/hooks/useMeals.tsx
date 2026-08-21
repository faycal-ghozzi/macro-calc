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
      .eq('is_archived', false)
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

  async function updateMeal(id: string, name: string, ingredients: Omit<MealIngredient, 'id' | 'meal_id'>[]) {
    if (!user) return { error: new Error('Not logged in') }
    const { error: nameErr } = await supabase.from('meals').update({ name }).eq('id', id)
    if (nameErr) return { error: nameErr }

    const { error: delErr } = await supabase.from('meal_ingredients').delete().eq('meal_id', id)
    if (delErr) return { error: delErr }

    if (ingredients.length > 0) {
      const { error: ingErr } = await supabase
        .from('meal_ingredients')
        .insert(ingredients.map((i) => ({ ...i, meal_id: id })))
      if (ingErr) return { error: ingErr }
    }

    await fetchMeals()
    return { error: null }
  }

  async function deleteMeal(id: string) {
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) setMeals((prev) => prev.filter((m) => m.id !== id))
    return { error }
  }

  async function touchMealUsed(id: string) {
    await supabase.from('meals').update({ last_used_at: new Date().toISOString() }).eq('id', id)
  }

  return { meals, loading, createMeal, updateMeal, deleteMeal, touchMealUsed, refetch: fetchMeals }
}
