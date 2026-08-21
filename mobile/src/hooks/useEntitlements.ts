import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resolveEntitlements } from '../lib/entitlements'
import type { UserEntitlements } from '../types'

export function useEntitlements() {
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

  const flags = resolveEntitlements(row)
  const isLocked = !!(row?.meals_slot_locked_at || row?.favorites_slot_locked_at)
  const hasReclaimedCoverage = isLocked && !flags.isSlotLocked

  useEffect(() => {
    if (!hasReclaimedCoverage) return
    supabase.rpc('restore_entitlement_archives').then(() => fetchRow())
  }, [hasReclaimedCoverage, fetchRow])

  async function checkAndIncrementMealCreated(): Promise<boolean> {
    const { data } = await supabase.rpc('check_and_increment_meal_created')
    await fetchRow()
    return !!data
  }

  async function checkAndIncrementFavoriteCreated(): Promise<boolean> {
    const { data } = await supabase.rpc('check_and_increment_favorite_created')
    await fetchRow()
    return !!data
  }

  async function checkAndIncrementQrShare(): Promise<boolean> {
    const { data } = await supabase.rpc('check_and_increment_qr_share')
    await fetchRow()
    return !!data
  }

  async function checkAndIncrementQrReceive(): Promise<boolean> {
    const { data } = await supabase.rpc('check_and_increment_qr_receive')
    await fetchRow()
    return !!data
  }

  return {
    row,
    flags,
    loading,
    refetch: fetchRow,
    checkAndIncrementMealCreated,
    checkAndIncrementFavoriteCreated,
    checkAndIncrementQrShare,
    checkAndIncrementQrReceive,
  }
}
