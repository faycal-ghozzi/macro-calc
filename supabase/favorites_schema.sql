-- Run this in the Supabase SQL editor

create table if not exists public.favorite_foods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  food_name text not null,
  barcode text,
  calories_100g numeric not null,
  protein_100g numeric not null,
  carbs_100g numeric not null,
  fat_100g numeric not null,
  fiber_100g numeric,
  sugar_100g numeric,
  piece_weight_g numeric,
  category text,
  source text not null default 'common',
  created_at timestamptz default now(),
  unique (user_id, food_name)
);

alter table public.favorite_foods enable row level security;

create policy "Users can manage own favorites" on public.favorite_foods
  for all using (auth.uid() = user_id);
