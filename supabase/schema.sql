-- MacroTrack Schema
-- Run this in your Supabase SQL editor

-- Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  height_cm numeric,
  birth_year integer,
  gender text check (gender in ('male', 'female', 'other')),
  goal text check (goal in ('lose', 'maintain', 'gain')) default 'maintain',
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')) default 'moderate',
  current_weight_kg numeric,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Weight Entries
create table if not exists public.weight_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  weight_kg numeric not null,
  logged_at date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.weight_entries enable row level security;
create policy "Users can manage own weight entries" on public.weight_entries
  for all using (auth.uid() = user_id);

-- Food Logs
create table if not exists public.food_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  logged_at date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  barcode text,
  amount_g numeric not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric default 0,
  sugar_g numeric default 0,
  created_at timestamptz default now()
);

alter table public.food_logs enable row level security;
create policy "Users can manage own food logs" on public.food_logs
  for all using (auth.uid() = user_id);

-- Saved Meals
create table if not exists public.meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

alter table public.meals enable row level security;
create policy "Users can manage own meals" on public.meals
  for all using (auth.uid() = user_id);

-- Meal Ingredients
create table if not exists public.meal_ingredients (
  id uuid default gen_random_uuid() primary key,
  meal_id uuid references public.meals on delete cascade not null,
  food_name text not null,
  barcode text,
  amount_g numeric not null,
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric default 0
);

alter table public.meal_ingredients enable row level security;
create policy "Users can manage own meal ingredients" on public.meal_ingredients
  for all using (
    exists (
      select 1 from public.meals
      where meals.id = meal_ingredients.meal_id
      and meals.user_id = auth.uid()
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
