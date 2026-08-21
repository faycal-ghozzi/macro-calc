import { Alert } from 'react-native'
import type { ProductId } from './products'

// No RevenueCat/store account exists yet, so purchases can't actually go
// live. These signatures match what `react-native-purchases` will need -
// swapping in real billing later means implementing these bodies, not
// touching any call site.

export async function purchaseProduct(_productId: ProductId): Promise<boolean> {
  Alert.alert('Coming soon', "Subscriptions aren't live yet - check back soon!")
  return false
}

export async function restorePurchases(): Promise<boolean> {
  Alert.alert('Coming soon', "Subscriptions aren't live yet - check back soon!")
  return false
}
