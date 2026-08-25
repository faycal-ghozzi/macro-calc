import type { UserEntitlements } from '../types'
import { PRODUCTS, INDIVIDUAL_PRODUCT_IDS, type ProductId } from './products'

export interface FeatureFlags {
  canCreateMeal: boolean
  canAddFavorite: boolean
  canShareQR: boolean
  canReceiveQR: boolean
  hasMonthlyReports: boolean
  hasAllThemes: boolean
  adsEnabled: boolean
  isComped: boolean
  isSlotLocked: boolean
  activeProductIds: ProductId[]
}

function isCompedActive(row: UserEntitlements | null): boolean {
  if (!row?.is_comped) return false
  return !row.comped_until || new Date(row.comped_until) > new Date()
}

function hasCoverage(activeProductIds: ProductId[], product: ProductId): boolean {
  return activeProductIds.includes(product) || activeProductIds.includes('pro_bundle')
}

// Feature flags are derived from the user_entitlements row alone - never
// from live meal/favorite counts. The lifetime counters (which only ever
// increment) are what the free tier is actually gated on; a live count can
// drop after a delete while the cap stays hit, and that's intentional.
export function resolveEntitlements(row: UserEntitlements | null): FeatureFlags {
  const comped = isCompedActive(row)
  const activeProductIds = (row?.active_product_ids ?? []) as ProductId[]

  const unlimitedMealsFavorites = comped || hasCoverage(activeProductIds, 'unlimited_meals_favorites')
  const qrUnlimited = comped || hasCoverage(activeProductIds, 'qr_sharing_unlimited')
  const isLocked = !!(row?.meals_slot_locked_at || row?.favorites_slot_locked_at)

  return {
    canCreateMeal: unlimitedMealsFavorites || (row?.meals_created_lifetime ?? 0) < 1,
    canAddFavorite: unlimitedMealsFavorites || (row?.favorites_created_lifetime ?? 0) < 5,
    canShareQR: qrUnlimited || (row?.qr_shares_lifetime ?? 0) < 1,
    canReceiveQR: qrUnlimited || (row?.qr_receives_lifetime ?? 0) < 1,
    hasMonthlyReports: comped || hasCoverage(activeProductIds, 'advanced_reports'),
    hasAllThemes: comped || hasCoverage(activeProductIds, 'all_themes'),
    adsEnabled: !comped && !hasCoverage(activeProductIds, 'remove_ads'),
    isComped: comped,
    isSlotLocked: isLocked && !unlimitedMealsFavorites,
    activeProductIds,
  }
}

export function activeIndividualCount(activeProductIds: ProductId[]): number {
  return INDIVIDUAL_PRODUCT_IDS.filter((id) => activeProductIds.includes(id)).length
}

function combinedIndividualPrice(productIds: ProductId[], billing: 'monthly' | 'annual'): number {
  return INDIVIDUAL_PRODUCT_IDS
    .filter((id) => productIds.includes(id))
    .reduce((sum, id) => sum + (billing === 'monthly' ? PRODUCTS[id].monthlyPrice : PRODUCTS[id].annualPrice), 0)
}

export function bundleSavings(activeProductIds: ProductId[], billing: 'monthly' | 'annual'): number {
  const bundlePrice = billing === 'monthly' ? PRODUCTS.pro_bundle.monthlyPrice : PRODUCTS.pro_bundle.annualPrice
  return Math.max(0, combinedIndividualPrice(activeProductIds, billing) - bundlePrice)
}

// Used to nudge someone activating a new individual add-on toward the Pro
// bundle instead, when doing so would bring their combined individual spend
// close to (or over) what the bundle costs outright.
const BUNDLE_UPSELL_THRESHOLD = 0.8

export function wouldApproachBundle(activeProductIds: ProductId[], addingProductId: ProductId, billing: 'monthly' | 'annual' = 'monthly'): boolean {
  const bundlePrice = billing === 'monthly' ? PRODUCTS.pro_bundle.monthlyPrice : PRODUCTS.pro_bundle.annualPrice
  const hypothetical = combinedIndividualPrice([...activeProductIds, addingProductId], billing)
  return hypothetical >= bundlePrice * BUNDLE_UPSELL_THRESHOLD
}
