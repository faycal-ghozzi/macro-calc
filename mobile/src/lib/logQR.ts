import type { FoodLog, MealType } from '../types'

const MEAL_SHORT: Record<MealType, string> = {
  breakfast: 'b',
  lunch: 'l',
  dinner: 'd',
  snack: 's',
}

const SHORT_MEAL: Record<string, MealType> = {
  b: 'breakfast',
  l: 'lunch',
  d: 'dinner',
  s: 'snack',
}

export interface LogQREntry {
  t: string   // meal type (short)
  n: string   // food_name
  a: number   // amount_g
  c: number   // calories
  p: number   // protein_g
  cb: number  // carbs_g
  f: number   // fat_g
  fi?: number // fiber_g
}

export interface LogQRData {
  v: 1
  tp: 'log'    // type discriminator (avoids clash with meal QR which has no tp field)
  d: string    // date YYYY-MM-DD
  e: LogQREntry[]
}

export function encodeLogToQR(logs: FoodLog[], date: string): string {
  const data: LogQRData = {
    v: 1,
    tp: 'log',
    d: date,
    e: logs.map((log) => ({
      t: MEAL_SHORT[log.meal_type] ?? 's',
      n: log.food_name,
      a: log.amount_g,
      c: log.calories,
      p: log.protein_g,
      cb: log.carbs_g,
      f: log.fat_g,
      ...(log.fiber_g ? { fi: log.fiber_g } : {}),
    })),
  }
  return JSON.stringify(data)
}

export function decodeLogFromQR(text: string): LogQRData | null {
  try {
    const data = JSON.parse(text)
    if (data.v !== 1 || data.tp !== 'log' || typeof data.d !== 'string' || !Array.isArray(data.e)) return null
    return data as LogQRData
  } catch {
    return null
  }
}

export function logEntryMealType(entry: LogQREntry): MealType {
  return SHORT_MEAL[entry.t] ?? 'snack'
}
