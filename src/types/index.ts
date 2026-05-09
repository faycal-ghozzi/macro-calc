export interface Profile {
  id: string
  name: string | null
  height_cm: number | null
  birth_year: number | null
  gender: 'male' | 'female' | 'other' | null
  goal: 'lose' | 'maintain' | 'gain'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  current_weight_kg: number | null
}

export interface WeightEntry {
  id: string
  user_id: string
  weight_kg: number
  logged_at: string
  notes?: string
  created_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  logged_at: string
  meal_type: MealType
  food_name: string
  barcode?: string
  amount_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  created_at: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MeasurementUnit = 'g' | 'ml' | 'cl' | 'L' | 'tbsp' | 'tsp' | 'piece'

export interface FoodItem {
  name: string
  barcode?: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g?: number
  sugar_100g?: number
  source: 'openfoodfacts' | 'common'
  category?: string
  piece_weight_g?: number
}

export interface Meal {
  id: string
  user_id: string
  name: string
  created_at: string
  ingredients?: MealIngredient[]
}

export interface MealIngredient {
  id: string
  meal_id: string
  food_name: string
  barcode?: string
  amount_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
}

export interface MacroTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DailyTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}
