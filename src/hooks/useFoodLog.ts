import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FoodLog, MealType } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useFoodLog(date: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<FoodLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLogs([]); setLoading(false); return }
    fetchLogs()
  }, [user, date])

  async function fetchLogs() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true })
    setLogs((data as FoodLog[]) ?? [])
    setLoading(false)
  }

  async function addFoodLog(entry: Omit<FoodLog, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('food_logs')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single()
    if (!error && data) setLogs((prev) => [...prev, data as FoodLog])
    return { error }
  }

  async function deleteFoodLog(id: string) {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (!error) setLogs((prev) => prev.filter((l) => l.id !== id))
    return { error }
  }

  const byMeal = (meal: MealType) => logs.filter((l) => l.meal_type === meal)

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein_g: acc.protein_g + l.protein_g,
      carbs_g: acc.carbs_g + l.carbs_g,
      fat_g: acc.fat_g + l.fat_g,
      fiber_g: acc.fiber_g + (l.fiber_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )

  return { logs, loading, totals, byMeal, addFoodLog, deleteFoodLog, refetch: fetchLogs }
}
