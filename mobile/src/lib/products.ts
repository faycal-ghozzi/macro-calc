export type ProductId =
  | 'remove_ads'
  | 'unlimited_meals_favorites'
  | 'qr_sharing_unlimited'
  | 'advanced_reports'
  | 'all_themes'
  | 'pro_bundle'

export interface Product {
  id: ProductId
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
}

export const PRODUCTS: Record<ProductId, Product> = {
  remove_ads: {
    id: 'remove_ads',
    name: 'Remove Ads',
    description: 'All ads removed',
    monthlyPrice: 0.99,
    annualPrice: 6.99,
  },
  unlimited_meals_favorites: {
    id: 'unlimited_meals_favorites',
    name: 'Unlimited Meals & Favorites',
    description: 'No cap on saved meals or favorites',
    monthlyPrice: 1.49,
    annualPrice: 9.99,
  },
  qr_sharing_unlimited: {
    id: 'qr_sharing_unlimited',
    name: 'Unlimited QR Sharing',
    description: 'Unlimited QR send/receive, bulk multi-recipient sharing',
    monthlyPrice: 1.99,
    annualPrice: 12.99,
  },
  advanced_reports: {
    id: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Monthly/trend progress views, CSV/PDF export',
    monthlyPrice: 1.49,
    annualPrice: 9.99,
  },
  all_themes: {
    id: 'all_themes',
    name: 'All Themes',
    description: 'Daylight, Terra, and Voltage themes',
    monthlyPrice: 0.99,
    annualPrice: 6.99,
  },
  pro_bundle: {
    id: 'pro_bundle',
    name: 'MacroTrack Pro',
    description: 'Everything unlocked',
    monthlyPrice: 4.99,
    annualPrice: 34.99,
  },
}

export const PRODUCT_ORDER: ProductId[] = [
  'remove_ads',
  'unlimited_meals_favorites',
  'qr_sharing_unlimited',
  'advanced_reports',
  'all_themes',
  'pro_bundle',
]

export const INDIVIDUAL_PRODUCT_IDS: ProductId[] = PRODUCT_ORDER.filter((id) => id !== 'pro_bundle')
