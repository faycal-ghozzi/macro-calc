export type ProductId =
  | 'remove_ads'
  | 'unlimited_meals_favorites'
  | 'qr_sharing_unlimited'
  | 'advanced_reports'
  | 'all_themes'
  | 'pro_bundle'

export interface Product {
  id: ProductId
  nameKey: string
  descriptionKey: string
  monthlyPrice: number
  annualPrice: number
}

export const PRODUCTS: Record<ProductId, Product> = {
  remove_ads: {
    id: 'remove_ads',
    nameKey: 'products.removeAdsName',
    descriptionKey: 'products.removeAdsDescription',
    monthlyPrice: 0.99,
    annualPrice: 6.99,
  },
  unlimited_meals_favorites: {
    id: 'unlimited_meals_favorites',
    nameKey: 'products.unlimitedMealsFavoritesName',
    descriptionKey: 'products.unlimitedMealsFavoritesDescription',
    monthlyPrice: 1.49,
    annualPrice: 9.99,
  },
  qr_sharing_unlimited: {
    id: 'qr_sharing_unlimited',
    nameKey: 'products.qrSharingName',
    descriptionKey: 'products.qrSharingDescription',
    monthlyPrice: 1.99,
    annualPrice: 12.99,
  },
  advanced_reports: {
    id: 'advanced_reports',
    nameKey: 'products.advancedReportsName',
    descriptionKey: 'products.advancedReportsDescription',
    monthlyPrice: 1.49,
    annualPrice: 9.99,
  },
  all_themes: {
    id: 'all_themes',
    nameKey: 'products.allThemesName',
    descriptionKey: 'products.allThemesDescription',
    monthlyPrice: 0.99,
    annualPrice: 6.99,
  },
  pro_bundle: {
    id: 'pro_bundle',
    nameKey: 'products.proBundleName',
    descriptionKey: 'products.proBundleDescription',
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
