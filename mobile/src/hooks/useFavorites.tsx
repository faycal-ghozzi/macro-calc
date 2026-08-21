import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FoodItem } from '../types'

export interface FavoriteRow {
  id: string
  food_name: string
  barcode?: string
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g?: number
  sugar_100g?: number
  piece_weight_g?: number
  category?: string
  source: string
  last_used_at?: string
}

function rowToFoodItem(row: FavoriteRow): FoodItem {
  return {
    name: row.food_name,
    barcode: row.barcode,
    calories_100g: row.calories_100g,
    protein_100g: row.protein_100g,
    carbs_100g: row.carbs_100g,
    fat_100g: row.fat_100g,
    fiber_100g: row.fiber_100g,
    sugar_100g: row.sugar_100g,
    piece_weight_g: row.piece_weight_g,
    category: row.category,
    source: row.source as FoodItem['source'],
  }
}

interface FavoritesContextType {
  favorites: FoodItem[]
  rawFavorites: FavoriteRow[]
  loading: boolean
  fetchError: string | null
  isFavorite: (food: FoodItem) => boolean
  toggleFavorite: (food: FoodItem) => Promise<void>
  touchFavoriteUsed: (food: FoodItem) => Promise<void>
  refetch: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  rawFavorites: [],
  loading: true,
  fetchError: null,
  isFavorite: () => false,
  toggleFavorite: async () => {},
  touchFavoriteUsed: async () => {},
  refetch: async () => {},
})

// Fetched once here and shared via context, rather than every screen/modal
// that calls useFavorites() re-fetching independently.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [rows, setRows] = useState<FavoriteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setFetchError(null)
    const { data, error } = await supabase
      .from('favorite_foods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (error) { setFetchError(error.message); setLoading(false); return }
    setRows((data as FavoriteRow[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { setRows([]); setLoading(false); return }
    fetchRows()
  }, [user, fetchRows])

  const favorites: FoodItem[] = useMemo(() => rows.map(rowToFoodItem), [rows])

  const isFavorite = useCallback((food: FoodItem): boolean => {
    if (food.barcode) return rows.some((r) => r.barcode === food.barcode)
    return rows.some((r) => r.food_name.toLowerCase() === food.name.toLowerCase())
  }, [rows])

  const addFavorite = useCallback(async (food: FoodItem) => {
    if (!user) return
    const payload = {
      user_id: user.id,
      food_name: food.name,
      barcode: food.barcode,
      calories_100g: food.calories_100g,
      protein_100g: food.protein_100g,
      carbs_100g: food.carbs_100g,
      fat_100g: food.fat_100g,
      fiber_100g: food.fiber_100g,
      sugar_100g: food.sugar_100g,
      piece_weight_g: food.piece_weight_g,
      category: food.category,
      source: food.source,
    }
    const { data, error } = await supabase
      .from('favorite_foods')
      .insert(payload)
      .select()
      .single()
    if (!error && data) setRows((prev) => [data as FavoriteRow, ...prev])
  }, [user])

  const removeFavorite = useCallback(async (food: FoodItem) => {
    if (!user) return
    let query = supabase.from('favorite_foods').delete().eq('user_id', user.id)
    if (food.barcode) {
      query = query.eq('barcode', food.barcode)
    } else {
      query = query.eq('food_name', food.name)
    }
    const { error } = await query
    if (!error) {
      setRows((prev) =>
        prev.filter((r) =>
          food.barcode ? r.barcode !== food.barcode : r.food_name.toLowerCase() !== food.name.toLowerCase()
        )
      )
    }
  }, [user])

  const toggleFavorite = useCallback(async (food: FoodItem) => {
    if (isFavorite(food)) await removeFavorite(food)
    else await addFavorite(food)
  }, [isFavorite, removeFavorite, addFavorite])

  const touchFavoriteUsed = useCallback(async (food: FoodItem) => {
    let query = supabase.from('favorite_foods').update({ last_used_at: new Date().toISOString() })
    query = food.barcode ? query.eq('barcode', food.barcode) : query.eq('food_name', food.name)
    if (user) await query.eq('user_id', user.id)
  }, [user])

  const value = useMemo(
    () => ({ favorites, rawFavorites: rows, loading, fetchError, isFavorite, toggleFavorite, touchFavoriteUsed, refetch: fetchRows }),
    [favorites, rows, loading, fetchError, isFavorite, toggleFavorite, touchFavoriteUsed, fetchRows]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export const useFavorites = () => useContext(FavoritesContext)
