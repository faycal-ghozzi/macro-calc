-- Run this in the Supabase SQL editor as an addition to schema.sql

create table if not exists public.water_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  logged_at date not null default current_date,
  amount_ml numeric not null,
  created_at timestamptz default now()
);

alter table public.water_logs enable row level security;

create policy "Users can manage own water logs" on public.water_logs
  for all using (auth.uid() = user_id);

alter table public.profiles add column if not exists water_goal_ml numeric not null default 2000;
