import type { MealType } from '../types'

// Single source of truth - was previously copy-pasted between DashboardScreen
// and FoodLogScreen, with the display label re-derived via .charAt(0)... in
// both places instead of going through translation keys.
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
}

export const MEAL_TYPE_LABEL_KEYS: Record<MealType, string> = {
  breakfast: 'mealType.breakfast',
  lunch: 'mealType.lunch',
  dinner: 'mealType.dinner',
  snack: 'mealType.snack',
}
