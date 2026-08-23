import type { UnitSystem } from '../store/useUnitsStore'

const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54
const ML_PER_FLOZ = 29.5735

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToIn(cm))
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 }
}

export function ftInToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches)
}

// Canonical storage is always metric (profiles.height_cm, current_weight_kg,
// weight_entries.weight_kg) - these helpers only convert at the UI edge.
export function weightUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'lb' : 'kg'
}

export function kgToDisplayValue(weightKg: number, system: UnitSystem): number {
  return system === 'imperial' ? kgToLb(weightKg) : weightKg
}

export function displayValueToKg(value: number, system: UnitSystem): number {
  return system === 'imperial' ? lbToKg(value) : value
}

export function formatWeight(weightKg: number, system: UnitSystem, digits = 1): string {
  return `${kgToDisplayValue(weightKg, system).toFixed(digits)} ${weightUnitLabel(system)}`
}

// A weight delta (e.g. change since last entry) converts the same way a raw
// value does - kg->lb is a pure scale factor, no offset to worry about.
export function formatWeightDelta(deltaKg: number, system: UnitSystem, digits = 1): string {
  const value = system === 'imperial' ? kgToLb(deltaKg) : deltaKg
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)} ${weightUnitLabel(system)}`
}

export function formatHeight(heightCm: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const { feet, inches } = cmToFtIn(heightCm)
    return `${feet}' ${inches}"`
  }
  return `${Math.round(heightCm)} cm`
}

// Sane-input bounds for weight entry, mirroring the existing 20-500kg check
// but expressed in whichever unit the field is currently showing.
export function weightBounds(system: UnitSystem): { min: number; max: number } {
  if (system === 'imperial') return { min: Math.round(kgToLb(20)), max: Math.round(kgToLb(500)) }
  return { min: 20, max: 500 }
}

// Canonical storage for water is always ml (profiles.water_goal_ml,
// water_logs.amount_ml) - same UI-edge-only conversion boundary as weight/height.
export function mlToFlOz(ml: number): number {
  return ml / ML_PER_FLOZ
}

export function flOzToMl(flOz: number): number {
  return flOz * ML_PER_FLOZ
}

export function waterUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'fl oz' : 'ml'
}

export function mlToDisplayValue(ml: number, system: UnitSystem): number {
  return system === 'imperial' ? mlToFlOz(ml) : ml
}

export function displayValueToMl(value: number, system: UnitSystem): number {
  return system === 'imperial' ? flOzToMl(value) : value
}

// Canonical storage for macros and food/ingredient amounts is always grams
// (food_logs.amount_g/protein_g/carbs_g/fat_g, meal_ingredients.*, etc.) -
// same UI-edge-only conversion boundary as weight/height/water. This covers
// small food-scale masses (macros, serving sizes), distinct from body weight
// which converts to lb instead - grams-to-lb would be far too coarse a unit
// for something like "8g fat".
const G_PER_OZ = 28.3495

export function gToOz(g: number): number {
  return g / G_PER_OZ
}

export function ozToG(oz: number): number {
  return oz * G_PER_OZ
}

export function massUnitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'oz' : 'g'
}

export function gToDisplayValue(g: number, system: UnitSystem): number {
  return system === 'imperial' ? gToOz(g) : g
}

export function displayValueToG(value: number, system: UnitSystem): number {
  return system === 'imperial' ? ozToG(value) : value
}

const OZ_PER_LB = 16

// Compact formatter for the many inline "150g" / "8g" style badges that
// don't go through MacroBar. Whole-gram rounding is fine metric, but a
// single-digit gram value (e.g. 8g fat) rounds to 0oz - imperial keeps one
// decimal so small quantities stay meaningful. Per-day/per-item macro
// amounts never get large enough to need this, but sums across a whole
// range (e.g. a "Total" stat) can - switching to kg/lb above 1000g/16oz
// keeps those readable instead of overflowing a compact badge.
export function formatMass(g: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const oz = gToOz(g)
    if (Math.abs(oz) >= OZ_PER_LB) return `${(Math.round((oz / OZ_PER_LB) * 10) / 10).toFixed(1)}lb`
    return `${(Math.round(oz * 10) / 10).toFixed(1)}${massUnitLabel(system)}`
  }
  if (Math.abs(g) >= 1000) return `${(Math.round((g / 1000) * 10) / 10).toFixed(1)}kg`
  return `${Math.round(g)}${massUnitLabel(system)}`
}
