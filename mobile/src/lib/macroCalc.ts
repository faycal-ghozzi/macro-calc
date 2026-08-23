import { Profile, MacroTargets, MeasurementUnit } from '../types'

// Caps values at 2 decimal places for display/storage - kills both raw
// API garbage (OpenFoodFacts often returns things like 3.9999999999999996)
// and float-accumulation drift from summing already-rounded numbers.
export function roundTo2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

const UNIT_TO_G: Record<MeasurementUnit, number> = {
  g: 1,
  oz: 28.3495,
  lb: 453.592,
  ml: 1,
  cl: 10,
  L: 1000,
  tbsp: 15,
  tsp: 5,
  piece: 1, // multiplied by piece_weight_g separately
}

export function convertToGrams(amount: number, unit: MeasurementUnit, piece_weight_g?: number): number {
  if (unit === 'piece') return roundTo2(amount * (piece_weight_g ?? 100))
  return roundTo2(amount * UNIT_TO_G[unit])
}

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

// A flat kcal offset over/undershoots wildly depending on the person's TDEE
// (a flat -500 is a ~31% cut for a small sedentary person but only ~14% for
// a large active one) - use a percentage of TDEE instead. Values are within
// the commonly recommended 10-20% deficit / 5-15% surplus bands.
const GOAL_ADJUST_PCT: Record<string, number> = {
  lose: -0.15,
  maintain: 0,
  gain: 0.10,
}

export const PROTEIN_PER_KG_RANGE = { min: 1.6, max: 2.2, default: 1.6 }
export const FAT_PER_KG_RANGE = { min: 0.6, max: 1.0, default: 0.8 }

const MIN_AGE = 13
const MAX_AGE = 100
const MIN_HEIGHT_CM = 90
const MAX_HEIGHT_CM = 250
const MIN_WEIGHT_KG = 30
const MAX_WEIGHT_KG = 300
// Height and weight can each be individually plausible (e.g. 100cm, 100kg)
// while their combination isn't - a BMI of 100 doesn't occur in a living
// adult. This range is deliberately generous (real documented human BMIs
// span roughly 12-70) so it only catches mismatched-field data-entry errors.
const MIN_BMI = 12
const MAX_BMI = 75

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

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

  // A typo'd birth year (e.g. a future date) or an implausible height/weight
  // doesn't just produce a slightly-off result - it can flip the age term's
  // sign and produce a confidently wrong target. Treat out-of-range inputs
  // the same as a missing profile rather than surfacing a garbage number.
  if (
    age < MIN_AGE || age > MAX_AGE ||
    height < MIN_HEIGHT_CM || height > MAX_HEIGHT_CM ||
    weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG
  ) {
    return null
  }

  const heightM = height / 100
  const bmi = weight / (heightM * heightM)
  if (bmi < MIN_BMI || bmi > MAX_BMI) {
    return null
  }

  // Mifflin-St Jeor has no third term for a non-binary gender - average the
  // two sex-specific formulas rather than silently defaulting to one.
  const maleBmr = 10 * weight + 6.25 * height - 5 * age + 5
  const femaleBmr = 10 * weight + 6.25 * height - 5 * age - 161
  let bmr = (maleBmr + femaleBmr) / 2
  if (profile.gender === 'male') bmr = maleBmr
  else if (profile.gender === 'female') bmr = femaleBmr

  const tdee = bmr * ACTIVITY_FACTORS[profile.activity_level]
  const calories = Math.round(tdee * (1 + GOAL_ADJUST_PCT[profile.goal]))

  const proteinPerKg = clamp(profile.protein_per_kg || PROTEIN_PER_KG_RANGE.default, PROTEIN_PER_KG_RANGE.min, PROTEIN_PER_KG_RANGE.max)
  const fatPerKg = clamp(profile.fat_per_kg || FAT_PER_KG_RANGE.default, FAT_PER_KG_RANGE.min, FAT_PER_KG_RANGE.max)

  let protein_g = Math.round(weight * proteinPerKg)
  let fat_g = Math.round(weight * fatPerKg)

  // Protein + fat are both weight-derived and independent of the calorie
  // target, so an extreme bodyweight against a low target can make them
  // alone exceed it. Scale both down proportionally so carbs never needs to
  // go negative and the three macros still sum to the calorie target -
  // instead of silently zeroing carbs while protein+fat overshoot it.
  const proteinFatCalories = protein_g * 4 + fat_g * 9
  if (proteinFatCalories > calories) {
    const scale = calories / proteinFatCalories
    protein_g = Math.round(protein_g * scale)
    fat_g = Math.round(fat_g * scale)
  }

  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4))

  return { calories, protein_g, carbs_g, fat_g }
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
  const totals = ingredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
  return {
    calories: roundTo2(totals.calories),
    protein_g: roundTo2(totals.protein_g),
    carbs_g: roundTo2(totals.carbs_g),
    fat_g: roundTo2(totals.fat_g),
  }
}
