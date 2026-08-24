import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
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

// Upper bound for the flexible "last N days" selector - free tier caps
// lower than this (see FREE_MAX_DAYS in ProgressScreen), premium can pick
// anything up to this ceiling. All-time is unbounded and computed separately.
export const MAX_SELECTABLE_DAYS = 30

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function lastNDateKeys(n: number): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(dateKey(d))
  }
  return keys
}

function dateRangeKeys(fromStr: string, toStr: string): string[] {
  const keys: string[] = []
  const cursor = new Date(fromStr)
  const to = new Date(toStr)
  while (cursor <= to) {
    keys.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

function buildDayMap(dateKeys: string[]): Record<string, DayReport> {
  const map: Record<string, DayReport> = {}
  for (const key of dateKeys) {
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

interface ReportsContextType {
  getDays: (n: number) => ReportSummary
  getRange: (fromDate: string, toDate: string) => ReportSummary
  allTime: ReportSummary | null
  loading: boolean
  refetch: () => Promise<void>
}

const ReportsContext = createContext<ReportsContextType>({
  getDays: () => summarize([]),
  getRange: () => summarize([]),
  allTime: null,
  loading: true,
  refetch: async () => {},
})

export function ReportsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [windowDays, setWindowDays] = useState<DayReport[]>([])
  const [allTime, setAllTime] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const today = dateKey(new Date())

    // Fetched unbounded (no lower date bound) so the same round trip covers
    // both the recent N-day window and the full all-time history - avoids a
    // second query, at the cost of pulling a long-time user's whole log
    // history into memory. Acceptable for a personal tracker's data volume.
    const [{ data: foodLogs }, { data: exerciseLogs }] = await Promise.all([
      supabase
        .from('food_logs')
        .select('logged_at,calories,protein_g,carbs_g,fat_g')
        .eq('user_id', user.id)
        .lte('logged_at', today),
      supabase
        .from('exercise_logs')
        .select('logged_at,calories_burned')
        .eq('user_id', user.id)
        .lte('logged_at', today),
    ])

    const winMap = buildDayMap(lastNDateKeys(MAX_SELECTABLE_DAYS))
    const allDates = [
      ...(foodLogs ?? []).map((l) => l.logged_at as string),
      ...(exerciseLogs ?? []).map((l) => l.logged_at as string),
    ]
    const earliest = allDates.length ? allDates.reduce((a, b) => (a < b ? a : b)) : today
    const allMap = buildDayMap(dateRangeKeys(earliest, today))

    for (const log of foodLogs ?? []) {
      const win = winMap[log.logged_at]
      if (win) { win.calories += log.calories; win.protein_g += log.protein_g; win.carbs_g += log.carbs_g; win.fat_g += log.fat_g }
      const all = allMap[log.logged_at]
      if (all) { all.calories += log.calories; all.protein_g += log.protein_g; all.carbs_g += log.carbs_g; all.fat_g += log.fat_g }
    }
    for (const log of exerciseLogs ?? []) {
      const win = winMap[log.logged_at]
      if (win) win.calories_burned += log.calories_burned
      const all = allMap[log.logged_at]
      if (all) all.calories_burned += log.calories_burned
    }
    for (const d of Object.values(winMap)) d.net_calories = d.calories - d.calories_burned
    for (const d of Object.values(allMap)) d.net_calories = d.calories - d.calories_burned

    setWindowDays(Object.values(winMap).sort((a, b) => a.date.localeCompare(b.date)))
    setAllTime(summarize(Object.values(allMap).sort((a, b) => a.date.localeCompare(b.date))))
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchReports()
  }, [user, fetchReports])

  const getDays = useCallback((n: number): ReportSummary => {
    const clamped = Math.min(Math.max(n, 1), MAX_SELECTABLE_DAYS)
    return summarize(windowDays.slice(-clamped))
  }, [windowDays])

  const getRange = useCallback((fromDate: string, toDate: string): ReportSummary => {
    if (!allTime) return summarize([])
    return summarize(allTime.days.filter((d) => d.date >= fromDate && d.date <= toDate))
  }, [allTime])

  const value = useMemo(
    () => ({ getDays, getRange, allTime, loading, refetch: fetchReports }),
    [getDays, getRange, allTime, loading, fetchReports]
  )

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>
}

export const useReports = () => useContext(ReportsContext)
