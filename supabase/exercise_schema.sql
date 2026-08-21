-- Run this in the Supabase SQL editor as an addition to schema.sql

create table if not exists public.exercise_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  logged_at date not null default current_date,
  name text not null,
  duration_min integer,
  calories_burned numeric not null,
  created_at timestamptz default now()
);

alter table public.exercise_logs enable row level security;

create policy "Users can manage own exercise logs" on public.exercise_logs
  for all using (auth.uid() = user_id);
