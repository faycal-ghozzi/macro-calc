import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { FoodLog, MealType } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface DateEntry {
  logs: FoodLog[]
  loading: boolean
  fetchError: string | null
}

const EMPTY_ENTRY: DateEntry = { logs: [], loading: true, fetchError: null }

type NewFoodLog = Omit<FoodLog, 'id' | 'user_id' | 'created_at'>
type FoodLogUpdate = Partial<NewFoodLog>

interface FoodLogContextType {
  cache: Record<string, DateEntry>
  ensureFetched: (date: string) => void
  addFoodLog: (date: string, entry: NewFoodLog) => Promise<{ error: Error | null }>
  updateFoodLog: (date: string, id: string, updates: FoodLogUpdate) => Promise<{ error: Error | null }>
  deleteFoodLog: (date: string, id: string) => Promise<{ error: Error | null }>
  refetch: (date: string) => Promise<void>
}

const FoodLogContext = createContext<FoodLogContextType>({
  cache: {},
  ensureFetched: () => {},
  addFoodLog: async () => ({ error: new Error('Not logged in') }),
  updateFoodLog: async () => ({ error: new Error('Not logged in') }),
  deleteFoodLog: async () => ({ error: new Error('Not logged in') }),
  refetch: async () => {},
})

// Keyed by date and shared via context, so Dashboard and the Log screen (and
// anything else watching the same date) see the same data instead of each
// holding its own independent, out-of-sync copy.
export function FoodLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cache, setCache] = useState<Record<string, DateEntry>>({})
  const inFlight = useRef<Set<string>>(new Set())

  const fetchDate = useCallback(async (date: string) => {
    if (!user) return
    inFlight.current.add(date)
    setCache((prev) => ({ ...prev, [date]: { logs: prev[date]?.logs ?? [], loading: true, fetchError: null } }))
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true })
    inFlight.current.delete(date)
    if (error) {
      setCache((prev) => ({ ...prev, [date]: { logs: prev[date]?.logs ?? [], loading: false, fetchError: error.message } }))
      return
    }
    setCache((prev) => ({ ...prev, [date]: { logs: (data as FoodLog[]) ?? [], loading: false, fetchError: null } }))
  }, [user])

  const ensureFetched = useCallback((date: string) => {
    if (!user || cache[date] || inFlight.current.has(date)) return
    fetchDate(date)
  }, [user, cache, fetchDate])

  const addFoodLog = useCallback(async (date: string, entry: NewFoodLog) => {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('food_logs')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setCache((prev) => ({ ...prev, [date]: { logs: [...(prev[date]?.logs ?? []), data as FoodLog], loading: false, fetchError: null } }))
    }
    return { error }
  }, [user])

  const updateFoodLog = useCallback(async (date: string, id: string, updates: FoodLogUpdate) => {
    const { data, error } = await supabase
      .from('food_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setCache((prev) => ({
        ...prev,
        [date]: { logs: (prev[date]?.logs ?? []).map((l) => (l.id === id ? (data as FoodLog) : l)), loading: false, fetchError: null },
      }))
    }
    return { error }
  }, [])

  const deleteFoodLog = useCallback(async (date: string, id: string) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (!error) {
      setCache((prev) => ({ ...prev, [date]: { logs: (prev[date]?.logs ?? []).filter((l) => l.id !== id), loading: false, fetchError: null } }))
    }
    return { error }
  }, [])

  const refetch = useCallback((date: string) => fetchDate(date), [fetchDate])

  const value = useMemo(
    () => ({ cache, ensureFetched, addFoodLog, updateFoodLog, deleteFoodLog, refetch }),
    [cache, ensureFetched, addFoodLog, updateFoodLog, deleteFoodLog, refetch]
  )

  return <FoodLogContext.Provider value={value}>{children}</FoodLogContext.Provider>
}

export function useFoodLog(date: string) {
  const { cache, ensureFetched, addFoodLog, updateFoodLog, deleteFoodLog, refetch } = useContext(FoodLogContext)

  useEffect(() => { ensureFetched(date) }, [date, ensureFetched])

  const entry = cache[date] ?? EMPTY_ENTRY
  const byMeal = (meal: MealType) => entry.logs.filter((l) => l.meal_type === meal)
  const totals = entry.logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein_g: acc.protein_g + l.protein_g,
      carbs_g: acc.carbs_g + l.carbs_g,
      fat_g: acc.fat_g + l.fat_g,
      fiber_g: acc.fiber_g + (l.fiber_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  )

  return {
    logs: entry.logs,
    loading: entry.loading,
    fetchError: entry.fetchError,
    totals,
    byMeal,
    addFoodLog: (e: NewFoodLog) => addFoodLog(date, e),
    updateFoodLog: (id: string, u: FoodLogUpdate) => updateFoodLog(date, id, u),
    deleteFoodLog: (id: string) => deleteFoodLog(date, id),
    refetch: () => refetch(date),
  }
}
