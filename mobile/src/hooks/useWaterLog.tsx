import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { WaterLog } from '../types'

interface DateEntry {
  logs: WaterLog[]
  loading: boolean
}

const EMPTY_ENTRY: DateEntry = { logs: [], loading: true }

interface WaterLogContextType {
  cache: Record<string, DateEntry>
  ensureFetched: (date: string) => void
  addWaterLog: (date: string, amount_ml: number) => Promise<{ error: Error | null }>
  deleteWaterLog: (date: string, id: string) => Promise<{ error: Error | null }>
  refetch: (date: string) => Promise<void>
}

const WaterLogContext = createContext<WaterLogContextType>({
  cache: {},
  ensureFetched: () => {},
  addWaterLog: async () => ({ error: new Error('Not logged in') }),
  deleteWaterLog: async () => ({ error: new Error('Not logged in') }),
  refetch: async () => {},
})

// Keyed by date and shared via context - see useExerciseLog.tsx for the same pattern.
export function WaterLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cache, setCache] = useState<Record<string, DateEntry>>({})
  const inFlight = useRef<Set<string>>(new Set())

  const fetchDate = useCallback(async (date: string) => {
    if (!user) return
    inFlight.current.add(date)
    setCache((prev) => ({ ...prev, [date]: { logs: prev[date]?.logs ?? [], loading: true } }))
    const { data } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true })
    inFlight.current.delete(date)
    setCache((prev) => ({ ...prev, [date]: { logs: (data as WaterLog[]) ?? [], loading: false } }))
  }, [user])

  const ensureFetched = useCallback((date: string) => {
    if (!user || cache[date] || inFlight.current.has(date)) return
    fetchDate(date)
  }, [user, cache, fetchDate])

  const addWaterLog = useCallback(async (date: string, amount_ml: number) => {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('water_logs')
      .insert({ user_id: user.id, logged_at: date, amount_ml })
      .select()
      .single()
    if (!error && data) {
      setCache((prev) => ({ ...prev, [date]: { logs: [...(prev[date]?.logs ?? []), data as WaterLog], loading: false } }))
    }
    return { error }
  }, [user])

  const deleteWaterLog = useCallback(async (date: string, id: string) => {
    const { error } = await supabase.from('water_logs').delete().eq('id', id)
    if (!error) {
      setCache((prev) => ({ ...prev, [date]: { logs: (prev[date]?.logs ?? []).filter((l) => l.id !== id), loading: false } }))
    }
    return { error }
  }, [])

  const refetch = useCallback((date: string) => fetchDate(date), [fetchDate])

  const value = useMemo(
    () => ({ cache, ensureFetched, addWaterLog, deleteWaterLog, refetch }),
    [cache, ensureFetched, addWaterLog, deleteWaterLog, refetch]
  )

  return <WaterLogContext.Provider value={value}>{children}</WaterLogContext.Provider>
}

export function useWaterLog(date: string) {
  const { cache, ensureFetched, addWaterLog, deleteWaterLog, refetch } = useContext(WaterLogContext)

  useEffect(() => { ensureFetched(date) }, [date, ensureFetched])

  const entry = cache[date] ?? EMPTY_ENTRY
  const totalMl = entry.logs.reduce((s, l) => s + l.amount_ml, 0)

  return {
    logs: entry.logs,
    loading: entry.loading,
    totalMl,
    addWaterLog: (amount_ml: number) => addWaterLog(date, amount_ml),
    deleteWaterLog: (id: string) => deleteWaterLog(date, id),
    refetch: () => refetch(date),
  }
}
