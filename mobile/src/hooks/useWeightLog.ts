import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { WeightEntry } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function useWeightLog() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setEntries([]); setLoading(false); return }
    fetchEntries()
  }, [user])

  async function fetchEntries() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true })
    setEntries((data as WeightEntry[]) ?? [])
    setLoading(false)
  }

  async function addEntry(weight_kg: number, logged_at: string, notes?: string) {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('weight_entries')
      .insert({ user_id: user.id, weight_kg, logged_at, notes })
      .select()
      .single()
    if (!error && data) {
      setEntries((prev) => [...prev, data as WeightEntry].sort((a, b) => a.logged_at.localeCompare(b.logged_at)))
      // Update profile current weight
      await supabase
        .from('profiles')
        .update({ current_weight_kg: weight_kg })
        .eq('id', user.id)
    }
    return { error, data }
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('weight_entries').delete().eq('id', id)
    if (!error) setEntries((prev) => prev.filter((e) => e.id !== id))
    return { error }
  }

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const firstEntry = entries.length > 0 ? entries[0] : null
  const totalChange = latestEntry && firstEntry
    ? latestEntry.weight_kg - firstEntry.weight_kg
    : 0

  return { entries, loading, addEntry, deleteEntry, latestEntry, totalChange, refetch: fetchEntries }
}
