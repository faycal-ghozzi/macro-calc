import { Alert } from 'react-native'
import i18next from '../i18n'
import { supabase } from './supabase'
import type { ProductId } from './products'

// No RevenueCat/store account exists yet, so no real payment is collected -
// purchaseProduct/deactivateProduct write straight to user_entitlements via
// activate_product/deactivate_product (supabase/addon_toggle.sql), which is
// intentional for pre-launch dev/testing but has NO payment check. This
// MUST be replaced with real purchase verification before this app is
// public. Swapping in real billing later means changing these bodies, not
// touching any call site.

export async function purchaseProduct(productId: ProductId): Promise<boolean> {
  const { data, error } = await supabase.rpc('activate_product', { p_product_id: productId })
  return !error && !!data
}

export async function deactivateProduct(productId: ProductId): Promise<boolean> {
  const { data, error } = await supabase.rpc('deactivate_product', { p_product_id: productId })
  return !error && !!data
}

export async function restorePurchases(): Promise<boolean> {
  Alert.alert(i18next.t('common.comingSoonTitle'), i18next.t('common.comingSoonBody'))
  return false
}
