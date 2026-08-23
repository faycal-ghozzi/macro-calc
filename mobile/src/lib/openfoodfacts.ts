import i18next from '../i18n'
import { FoodItem } from '../types'
import { roundTo2 } from './macroCalc'

function parseNutriments(n: Record<string, number>): Omit<FoodItem, 'name' | 'barcode' | 'source' | 'category'> {
  const kcal =
    n['energy-kcal_100g'] ??
    n['energy-kcal'] ??
    (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined) ??
    0

  // OpenFoodFacts nutriment values often arrive as long floats
  // (e.g. 3.9999999999999996) - round at the boundary so nothing
  // downstream ever has to deal with that.
  return {
    calories_100g: Math.round(kcal),
    protein_100g: roundTo2(n['proteins_100g'] ?? 0),
    carbs_100g: roundTo2(n['carbohydrates_100g'] ?? 0),
    fat_100g: roundTo2(n['fat_100g'] ?? 0),
    fiber_100g: n['fiber_100g'] != null ? roundTo2(n['fiber_100g']) : undefined,
    sugar_100g: n['sugars_100g'] != null ? roundTo2(n['sugars_100g']) : undefined,
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<FoodItem | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    )
    const data = await res.json()

    if (data.status !== 1 || !data.product) return null

    const p = data.product
    const n: Record<string, number> = p.nutriments || {}

    return {
      name: p.product_name || p.generic_name || i18next.t('common.unknownProduct'),
      barcode,
      ...parseNutriments(n),
      source: 'openfoodfacts',
    }
  } catch {
    return null
  }
}

export async function searchProducts(query: string): Promise<FoodItem[]> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,generic_name,nutriments`
    )
    const data = await res.json()

    if (!data.products) return []

    return (data.products as Record<string, unknown>[])
      .filter(
        (p) =>
          p.product_name &&
          (p.nutriments as Record<string, number>)?.['energy-kcal_100g'] != null
      )
      .slice(0, 10)
      .map((p) => ({
        name: p.product_name as string,
        barcode: p.code as string | undefined,
        ...parseNutriments((p.nutriments as Record<string, number>) || {}),
        source: 'openfoodfacts' as const,
      }))
  } catch {
    return []
  }
}
