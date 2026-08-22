import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface ExerciseLog {
  id: string
  user_id: string
  logged_at: string
  name: string
  duration_min: number | null
  calories_burned: number
  created_at: string
}

interface DateEntry {
  logs: ExerciseLog[]
  loading: boolean
}

const EMPTY_ENTRY: DateEntry = { logs: [], loading: true }

type NewExerciseLog = { name: string; duration_min?: number; calories_burned: number; logged_at: string }

interface ExerciseLogContextType {
  cache: Record<string, DateEntry>
  ensureFetched: (date: string) => void
  addExerciseLog: (date: string, entry: NewExerciseLog) => Promise<{ error: Error | null }>
  deleteExerciseLog: (date: string, id: string) => Promise<{ error: Error | null }>
  refetch: (date: string) => Promise<void>
}

const ExerciseLogContext = createContext<ExerciseLogContextType>({
  cache: {},
  ensureFetched: () => {},
  addExerciseLog: async () => ({ error: new Error('Not logged in') }),
  deleteExerciseLog: async () => ({ error: new Error('Not logged in') }),
  refetch: async () => {},
})

// Keyed by date and shared via context - see useFoodLog.tsx for the same pattern.
export function ExerciseLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cache, setCache] = useState<Record<string, DateEntry>>({})
  const inFlight = useRef<Set<string>>(new Set())

  const fetchDate = useCallback(async (date: string) => {
    if (!user) return
    inFlight.current.add(date)
    setCache((prev) => ({ ...prev, [date]: { logs: prev[date]?.logs ?? [], loading: true } }))
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true })
    inFlight.current.delete(date)
    setCache((prev) => ({ ...prev, [date]: { logs: (data as ExerciseLog[]) ?? [], loading: false } }))
  }, [user])

  const ensureFetched = useCallback((date: string) => {
    if (!user || cache[date] || inFlight.current.has(date)) return
    fetchDate(date)
  }, [user, cache, fetchDate])

  const addExerciseLog = useCallback(async (date: string, entry: NewExerciseLog) => {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setCache((prev) => ({ ...prev, [date]: { logs: [...(prev[date]?.logs ?? []), data as ExerciseLog], loading: false } }))
    }
    return { error }
  }, [user])

  const deleteExerciseLog = useCallback(async (date: string, id: string) => {
    const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
    if (!error) {
      setCache((prev) => ({ ...prev, [date]: { logs: (prev[date]?.logs ?? []).filter((l) => l.id !== id), loading: false } }))
    }
    return { error }
  }, [])

  const refetch = useCallback((date: string) => fetchDate(date), [fetchDate])

  const value = useMemo(
    () => ({ cache, ensureFetched, addExerciseLog, deleteExerciseLog, refetch }),
    [cache, ensureFetched, addExerciseLog, deleteExerciseLog, refetch]
  )

  return <ExerciseLogContext.Provider value={value}>{children}</ExerciseLogContext.Provider>
}

export function useExerciseLog(date: string) {
  const { cache, ensureFetched, addExerciseLog, deleteExerciseLog, refetch } = useContext(ExerciseLogContext)

  useEffect(() => { ensureFetched(date) }, [date, ensureFetched])

  const entry = cache[date] ?? EMPTY_ENTRY
  const totalBurned = entry.logs.reduce((s, l) => s + l.calories_burned, 0)

  return {
    logs: entry.logs,
    loading: entry.loading,
    totalBurned,
    addExerciseLog: (e: NewExerciseLog) => addExerciseLog(date, e),
    deleteExerciseLog: (id: string) => deleteExerciseLog(date, id),
    refetch: () => refetch(date),
  }
}
