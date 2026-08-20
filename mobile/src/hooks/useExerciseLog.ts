import { useState, useEffect } from 'react'
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

export function useExerciseLog(date: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLogs([]); setLoading(false); return }
    fetchLogs()
  }, [user, date])

  async function fetchLogs() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('logged_at', date)
      .order('created_at', { ascending: true })
    setLogs((data as ExerciseLog[]) ?? [])
    setLoading(false)
  }

  async function addExerciseLog(entry: { name: string; duration_min?: number; calories_burned: number; logged_at: string }) {
    if (!user) return { error: new Error('Not logged in') }
    const { data, error } = await supabase
      .from('exercise_logs')
      .insert({ ...entry, user_id: user.id })
      .select()
      .single()
    if (!error && data) setLogs((prev) => [...prev, data as ExerciseLog])
    return { error }
  }

  async function deleteExerciseLog(id: string) {
    const { error } = await supabase.from('exercise_logs').delete().eq('id', id)
    if (!error) setLogs((prev) => prev.filter((l) => l.id !== id))
    return { error }
  }

  const totalBurned = logs.reduce((s, l) => s + l.calories_burned, 0)

  return { logs, loading, totalBurned, addExerciseLog, deleteExerciseLog, refetch: fetchLogs }
}
