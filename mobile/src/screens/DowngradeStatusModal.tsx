import { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import * as Haptics from '../lib/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { useEntitlements } from '../hooks/useEntitlements'
import { useMeals } from '../hooks/useMeals'
import { useFavorites } from '../hooks/useFavorites'
import { useDowngradeUiStore } from '../store/useDowngradeUiStore'
import { supabase } from '../lib/supabase'

const MAX_ACTIVE_FAVORITES = 5

export function DowngradeStatusModal() {
  const theme = useTheme()
  const { row, flags, refetch } = useEntitlements()
  const { meals, refetch: refetchMeals } = useMeals()
  const { rawFavorites, refetch: refetchFavorites } = useFavorites()
  const decidedSummaryShown = useDowngradeUiStore((s) => s.decidedSummaryShown)
  const setDecidedSummaryShown = useDowngradeUiStore((s) => s.setDecidedSummaryShown)
  const dismissed = useDowngradeUiStore((s) => s.dismissed)
  const setDismissed = useDowngradeUiStore((s) => s.setDismissed)

  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [selectedFavIds, setSelectedFavIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [archivedCounts, setArchivedCounts] = useState<{ meals: number; favorites: number } | null>(null)

  const isPending = !!row?.downgrade_grace_expires_at && !row?.meals_slot_locked_at && !row?.favorites_slot_locked_at
  const isDecided = flags.isSlotLocked

  useEffect(() => {
    if (!isDecided && decidedSummaryShown) setDecidedSummaryShown(false)
  }, [isDecided, decidedSummaryShown, setDecidedSummaryShown])

  // Pre-select defaults once per pending episode - guarded by a ref rather
  // than omitting meals/rawFavorites from deps, so a refetch mid-selection
  // (identity change, same data) doesn't clobber what the user already picked.
  const initializedForPending = useRef(false)
  useEffect(() => {
    if (isPending && !initializedForPending.current) {
      initializedForPending.current = true
      setSelectedMealId(meals[0]?.id ?? null)
      setSelectedFavIds(rawFavorites.slice(0, MAX_ACTIVE_FAVORITES).map((f) => f.id))
    }
    if (!isPending) initializedForPending.current = false
  }, [isPending, meals, rawFavorites])

  useEffect(() => {
    if (!isDecided || decidedSummaryShown) return
    let cancelled = false
    async function loadCounts() {
      if (!row) return
      const [m, f] = await Promise.all([
        supabase.from('meals').select('id', { count: 'exact', head: true }).eq('user_id', row.user_id).eq('is_archived', true),
        supabase.from('favorite_foods').select('id', { count: 'exact', head: true }).eq('user_id', row.user_id).eq('is_archived', true),
      ])
      if (!cancelled) setArchivedCounts({ meals: m.count ?? 0, favorites: f.count ?? 0 })
    }
    loadCounts()
    return () => { cancelled = true }
  }, [isDecided, decidedSummaryShown, row])

  const visible = (isPending || (isDecided && !decidedSummaryShown)) && !dismissed
  if (!visible) return null

  function toggleFav(id: string) {
    Haptics.selectionAsync()
    setSelectedFavIds((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id)
      if (prev.length >= MAX_ACTIVE_FAVORITES) return prev
      return [...prev, id]
    })
  }

  async function handleConfirm() {
    setSaving(true)
    await supabase.rpc('select_active_meals', { p_meal_ids: selectedMealId ? [selectedMealId] : [] })
    await supabase.rpc('select_active_favorites', { p_favorite_ids: selectedFavIds })
    setSaving(false)
    await Promise.all([refetch(), refetchMeals(), refetchFavorites()])
  }

  function handleDismissSummary() {
    Haptics.selectionAsync()
    setDecidedSummaryShown(true)
  }

  const daysLeft = row?.downgrade_grace_expires_at
    ? Math.max(0, Math.ceil((new Date(row.downgrade_grace_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setDismissed(true)}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.colors.card, borderTopLeftRadius: theme.style.cardRadius + 6, borderTopRightRadius: theme.style.cardRadius + 6 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {isPending ? 'Choose what stays active' : "Here's what's active now"}
            </Text>
            <Pressable onPress={() => setDismissed(true)} style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundElevated }]}>
              <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          {isPending ? (
            <>
              <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                Your plan now includes 1 saved meal and 5 favorites. Choose what to keep active, and everything else
                will be archived, not deleted, and comes back if you resubscribe.
                {daysLeft !== null ? ` If you don't choose within ${daysLeft} day${daysLeft === 1 ? '' : 's'}, we'll automatically keep your most recently used items and archive the rest.` : ''}
              </Text>

              <ScrollView style={{ maxHeight: 340 }}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>Meal (choose 1)</Text>
                {meals.map((meal) => (
                  <Pressable
                    key={meal.id}
                    onPress={() => { Haptics.selectionAsync(); setSelectedMealId(selectedMealId === meal.id ? null : meal.id) }}
                    style={[styles.optionRow, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}
                  >
                    <Ionicons name={selectedMealId === meal.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={selectedMealId === meal.id ? theme.colors.accent : theme.colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{meal.name}</Text>
                  </Pressable>
                ))}

                <Text style={[styles.sectionLabel, { color: theme.colors.textTertiary, marginTop: 12 }]}>
                  Favorites (choose up to {MAX_ACTIVE_FAVORITES}), {selectedFavIds.length}/{MAX_ACTIVE_FAVORITES} selected
                </Text>
                {rawFavorites.map((fav) => (
                  <Pressable
                    key={fav.id}
                    onPress={() => toggleFav(fav.id)}
                    style={[styles.optionRow, { backgroundColor: theme.colors.backgroundElevated, borderRadius: theme.style.cardRadius - 8 }]}
                  >
                    <Ionicons name={selectedFavIds.includes(fav.id) ? 'checkbox' : 'square-outline'} size={18} color={selectedFavIds.includes(fav.id) ? theme.colors.accent : theme.colors.textTertiary} />
                    <Text style={{ fontSize: 13, color: theme.colors.textPrimary }}>{fav.food_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Pressable
                onPress={handleConfirm}
                disabled={saving}
                style={[styles.confirmButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4, opacity: saving ? 0.6 : 1 }]}
              >
                {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : null}
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Confirm Selection</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                {archivedCounts
                  ? `${archivedCounts.meals} meal${archivedCounts.meals === 1 ? '' : 's'} and ${archivedCounts.favorites} favorite${archivedCounts.favorites === 1 ? '' : 's'} were archived, not deleted.`
                  : 'Some items were archived, not deleted.'} Resubscribe any time to get everything back instantly.
              </Text>
              <Pressable
                onPress={handleDismissSummary}
                style={[styles.confirmButton, { backgroundColor: theme.colors.accent, borderRadius: theme.style.cardRadius - 4 }]}
              >
                <Text style={{ color: theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>Got it</Text>
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6 },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginTop: 14, marginBottom: 8 },
})
