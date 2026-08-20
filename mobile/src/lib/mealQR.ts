import type { Meal, MealIngredient } from '../types'

export interface MealQRData {
  v: 1
  n: string
  i: {
    n: string
    a: number
    c: number
    p: number
    cb: number
    f: number
    fi?: number
  }[]
}

export function encodeMealToQR(meal: Meal): string {
  const data: MealQRData = {
    v: 1,
    n: meal.name,
    i: (meal.ingredients ?? []).map((ing) => ({
      n: ing.food_name,
      a: ing.amount_g,
      c: ing.calories,
      p: ing.protein_g,
      cb: ing.carbs_g,
      f: ing.fat_g,
      ...(ing.fiber_g ? { fi: ing.fiber_g } : {}),
    })),
  }
  return JSON.stringify(data)
}

export function decodeMealFromQR(text: string): MealQRData | null {
  try {
    const data = JSON.parse(text)
    if (data.v !== 1 || typeof data.n !== 'string' || !Array.isArray(data.i)) return null
    return data as MealQRData
  } catch {
    return null
  }
}

export function mealQRToIngredients(data: MealQRData): Omit<MealIngredient, 'id' | 'meal_id'>[] {
  return data.i.map((i) => ({
    food_name: i.n,
    amount_g: i.a,
    calories: i.c,
    protein_g: i.p,
    carbs_g: i.cb,
    fat_g: i.f,
    fiber_g: i.fi,
  }))
}
