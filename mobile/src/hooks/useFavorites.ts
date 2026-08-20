import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { FoodItem } from '../types'

interface FavoriteRow {
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

export function useFavorites() {
  const { user } = useAuth()
  const [rows, setRows] = useState<FavoriteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setRows([]); setLoading(false); return }
    fetch()
  }, [user])

  async function fetch() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('favorite_foods')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRows((data as FavoriteRow[]) ?? [])
    setLoading(false)
  }

  const favorites: FoodItem[] = rows.map(rowToFoodItem)

  const isFavorite = useCallback((food: FoodItem): boolean => {
    if (food.barcode) return rows.some((r) => r.barcode === food.barcode)
    return rows.some((r) => r.food_name.toLowerCase() === food.name.toLowerCase())
  }, [rows])

  async function addFavorite(food: FoodItem) {
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
  }

  async function removeFavorite(food: FoodItem) {
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
  }

  async function toggleFavorite(food: FoodItem) {
    if (isFavorite(food)) await removeFavorite(food)
    else await addFavorite(food)
  }

  return { favorites, loading, isFavorite, toggleFavorite }
}
