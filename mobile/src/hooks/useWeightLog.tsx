import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { WeightEntry } from '../types'
import { useAuth } from '../contexts/AuthContext'

interface WeightLogContextType {
  entries: WeightEntry[]
  loading: boolean
  addEntry: (weight_kg: number, logged_at: string, notes?: string) => Promise<{ error: Error | null; data?: WeightEntry }>
  deleteEntry: (id: string) => Promise<{ error: Error | null }>
  refetch: () => Promise<void>
}

const WeightLogContext = createContext<WeightLogContextType>({
  entries: [],
  loading: true,
  addEntry: async () => ({ error: new Error('Not logged in') }),
  deleteEntry: async () => ({ error: new Error('Not logged in') }),
  refetch: async () => {},
})

// Fetched once here and shared via context, rather than every screen
// (Progress, Dashboard) re-fetching independently.
export function WeightLogProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
    setEntries((data as WeightEntry[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return }
    fetchEntries()
  }, [user, fetchEntries])

  const addEntry = useCallback(async (weight_kg: number, logged_at: string, notes?: string) => {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('weight_entries')
      .insert({ user_id: user.id, weight_kg, logged_at, notes })
      .select()
      .single()
    if (!error && data) {
      setEntries((prev) => [...prev, data as WeightEntry].sort((a, b) => a.logged_at.localeCompare(b.logged_at)))
      await supabase
        .from('profiles')
        .update({ current_weight_kg: weight_kg })
        .eq('id', user.id)
    }
    return { error, data: data as WeightEntry | undefined }
  }, [user])

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('weight_entries').delete().eq('id', id)
    if (!error) setEntries((prev) => prev.filter((e) => e.id !== id))
    return { error }
  }, [])

  const value = useMemo(
    () => ({ entries, loading, addEntry, deleteEntry, refetch: fetchEntries }),
    [entries, loading, addEntry, deleteEntry, fetchEntries]
  )

  return <WeightLogContext.Provider value={value}>{children}</WeightLogContext.Provider>
}

function useWeightLogContext() {
  return useContext(WeightLogContext)
}

export function useWeightLog() {
  const { entries, loading, addEntry, deleteEntry, refetch } = useWeightLogContext()
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const firstEntry = entries.length > 0 ? entries[0] : null
  const totalChange = latestEntry && firstEntry
    ? latestEntry.weight_kg - firstEntry.weight_kg
    : 0
  return { entries, loading, addEntry, deleteEntry, latestEntry, totalChange, refetch }
}
