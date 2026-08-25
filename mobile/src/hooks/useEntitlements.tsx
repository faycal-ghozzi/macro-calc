import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resolveEntitlements, type FeatureFlags } from '../lib/entitlements'
import { purchaseProduct, deactivateProduct as deactivateProductRpc } from '../lib/purchases'
import type { ProductId } from '../lib/products'
import type { UserEntitlements } from '../types'

interface EntitlementsContextType {
  row: UserEntitlements | null
  flags: FeatureFlags
  loading: boolean
  refetch: () => Promise<void>
  checkAndIncrementMealCreated: () => Promise<boolean>
  checkAndIncrementFavoriteCreated: () => Promise<boolean>
  checkAndIncrementQrShare: () => Promise<boolean>
  checkAndIncrementQrReceive: () => Promise<boolean>
  checkAndIncrementReportExported: () => Promise<boolean>
  activateProduct: (productId: ProductId) => Promise<boolean>
  deactivateProduct: (productId: ProductId) => Promise<boolean>
}

const EntitlementsContext = createContext<EntitlementsContextType>({
  row: null,
  flags: resolveEntitlements(null),
  loading: true,
  refetch: async () => {},
  checkAndIncrementMealCreated: async () => false,
  checkAndIncrementFavoriteCreated: async () => false,
  checkAndIncrementQrShare: async () => false,
  checkAndIncrementQrReceive: async () => false,
  checkAndIncrementReportExported: async () => false,
  activateProduct: async () => false,
  deactivateProduct: async () => false,
})

// Fetched once here and shared via context, rather than every screen/modal
// that calls useEntitlements() re-fetching independently.
export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [row, setRow] = useState<UserEntitlements | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRow = useCallback(async () => {
    if (!user) { setRow(null); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('user_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setRow(data as UserEntitlements | null)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRow() }, [fetchRow])

  const flags = useMemo(() => resolveEntitlements(row), [row])
  const isLocked = !!(row?.meals_slot_locked_at || row?.favorites_slot_locked_at)
  const hasReclaimedCoverage = isLocked && !flags.isSlotLocked

  useEffect(() => {
    if (!hasReclaimedCoverage) return
    supabase.rpc('restore_entitlement_archives').then(() => fetchRow())
  }, [hasReclaimedCoverage, fetchRow])

  const checkAndIncrementMealCreated = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('check_and_increment_meal_created')
    await fetchRow()
    return !!data
  }, [fetchRow])

  const checkAndIncrementFavoriteCreated = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('check_and_increment_favorite_created')
    await fetchRow()
    return !!data
  }, [fetchRow])

  const checkAndIncrementQrShare = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('check_and_increment_qr_share')
    await fetchRow()
    return !!data
  }, [fetchRow])

  const checkAndIncrementQrReceive = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('check_and_increment_qr_receive')
    await fetchRow()
    return !!data
  }, [fetchRow])

  const checkAndIncrementReportExported = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.rpc('check_and_increment_report_exported')
    await fetchRow()
    return !!data
  }, [fetchRow])

  const activateProduct = useCallback(async (productId: ProductId): Promise<boolean> => {
    const ok = await purchaseProduct(productId)
    await fetchRow()
    return ok
  }, [fetchRow])

  const deactivateProduct = useCallback(async (productId: ProductId): Promise<boolean> => {
    const ok = await deactivateProductRpc(productId)
    await fetchRow()
    return ok
  }, [fetchRow])

  const value = useMemo(
    () => ({
      row,
      flags,
      loading,
      refetch: fetchRow,
      checkAndIncrementMealCreated,
      checkAndIncrementFavoriteCreated,
      checkAndIncrementQrShare,
      checkAndIncrementQrReceive,
      checkAndIncrementReportExported,
      activateProduct,
      deactivateProduct,
    }),
    [
      row, flags, loading, fetchRow,
      checkAndIncrementMealCreated, checkAndIncrementFavoriteCreated, checkAndIncrementQrShare, checkAndIncrementQrReceive,
      checkAndIncrementReportExported, activateProduct, deactivateProduct,
    ]
  )

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}

export const useEntitlements = () => useContext(EntitlementsContext)
