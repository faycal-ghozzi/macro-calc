import { Profile, MacroTargets } from '../types'

export function calculateMacroTargets(profile: Profile): MacroTargets | null {
  if (
    !profile.height_cm ||
    !profile.birth_year ||
    !profile.gender ||
    !profile.current_weight_kg
  ) {
    return null
  }

  const age = new Date().getFullYear() - profile.birth_year
  const weight = profile.current_weight_kg
  const height = profile.height_cm

  // Mifflin-St Jeor
  const bmr =
    profile.gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161

  const activityFactors: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  let tdee = bmr * activityFactors[profile.activity_level]

  const goalAdjust: Record<string, number> = {
    lose: -500,
    maintain: 0,
    gain: 300,
  }

  const calories = Math.round(tdee + goalAdjust[profile.goal])

  // Protein: 2g/kg bodyweight
  const protein_g = Math.round(weight * 2)
  // Fat: 25% of calories
  const fat_g = Math.round((calories * 0.25) / 9)
  // Carbs: remaining
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4)

  return { calories, protein_g, carbs_g: Math.max(0, carbs_g), fat_g }
}

export function calcMacrosFromAmount(
  food: { calories_100g: number; protein_100g: number; carbs_100g: number; fat_100g: number; fiber_100g?: number; sugar_100g?: number },
  amount_g: number
) {
  const ratio = amount_g / 100
  return {
    calories: Math.round(food.calories_100g * ratio),
    protein_g: Math.round(food.protein_100g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_100g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_100g * ratio * 10) / 10,
    fiber_g: food.fiber_100g != null ? Math.round(food.fiber_100g * ratio * 10) / 10 : 0,
    sugar_g: food.sugar_100g != null ? Math.round(food.sugar_100g * ratio * 10) / 10 : 0,
  }
}

export function calcMealTotals(ingredients: { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]) {
  return ingredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}
