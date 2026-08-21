-- Run this in the Supabase SQL editor to support logging meals as a single entry
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS meal_ingredients jsonb;