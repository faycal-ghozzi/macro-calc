import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface DayReport {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  calories_burned: number
  net_calories: number
}

export interface ReportSummary {
  days: DayReport[]
  avg_calories: number
  avg_net_calories: number
  avg_protein: number
  avg_carbs: number
  avg_fat: number
  total_burned: number
  active_days: number
}

function buildDayMap(numDays: number): Record<string, DayReport> {
  const map: Record<string, DayReport> = {}
  for (let i = 0; i < numDays; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    map[key] = { date: key, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, calories_burned: 0, net_calories: 0 }
  }
  return map
}

function summarize(days: DayReport[]): ReportSummary {
  const activeDays = days.filter((d) => d.calories > 0)
  const count = activeDays.length || 1
  return {
    days,
    avg_calories: Math.round(activeDays.reduce((s, d) => s + d.calories, 0) / count),
    avg_net_calories: Math.round(activeDays.reduce((s, d) => s + d.net_calories, 0) / count),
    avg_protein: Math.round(activeDays.reduce((s, d) => s + d.protein_g, 0) / count),
    avg_carbs: Math.round(activeDays.reduce((s, d) => s + d.carbs_g, 0) / count),
    avg_fat: Math.round(activeDays.reduce((s, d) => s + d.fat_g, 0) / count),
    total_burned: Math.round(days.reduce((s, d) => s + d.calories_burned, 0)),
    active_days: activeDays.length,
  }
}

export function useReports() {
  const { user } = useAuth()
  const [weekly, setWeekly] = useState<ReportSummary | null>(null)
  const [monthly, setMonthly] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchReports()
  }, [user])

  async function fetchReports() {
    if (!user) return
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(monthStart.getDate() - 29)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    const [{ data: foodLogs }, { data: exerciseLogs }] = await Promise.all([
      supabase
        .from('food_logs')
        .select('logged_at,calories,protein_g,carbs_g,fat_g')
        .eq('user_id', user.id)
        .gte('logged_at', monthStartStr)
        .lte('logged_at', today),
      supabase
        .from('exercise_logs')
        .select('logged_at,calories_burned')
        .eq('user_id', user.id)
        .gte('logged_at', monthStartStr)
        .lte('logged_at', today),
    ])

    const monthMap = buildDayMap(30)
    const weekMap = buildDayMap(7)

    for (const log of foodLogs ?? []) {
      const d = monthMap[log.logged_at]
      if (d) {
        d.calories += log.calories
        d.protein_g += log.protein_g
        d.carbs_g += log.carbs_g
        d.fat_g += log.fat_g
      }
    }

    for (const log of exerciseLogs ?? []) {
      const d = monthMap[log.logged_at]
      if (d) d.calories_burned += log.calories_burned
    }

    for (const d of Object.values(monthMap)) {
      d.net_calories = d.calories - d.calories_burned
    }

    const monthDays = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date))
    const weekDays = monthDays.slice(-7)

    // Sync weekMap from monthMap
    for (const day of weekDays) {
      if (weekMap[day.date]) Object.assign(weekMap[day.date], day)
    }

    setMonthly(summarize(monthDays))
    setWeekly(summarize(weekDays))
    setLoading(false)
  }

  return { weekly, monthly, loading, refetch: fetchReports }
}
