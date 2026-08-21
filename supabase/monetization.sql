-- Run this in the Supabase SQL editor as an addition to schema.sql
-- Per-feature subscription monetization: lifetime free-tier counters,
-- comped accounts, and a downgrade/archive-lock system.
--
-- MOBILE APP ONLY for now (web stays free). See the account-deletion
-- migration for the pg_cron pattern this reuses.

-- ============================================================
-- 1. user_entitlements
-- ============================================================

create table if not exists public.user_entitlements (
  user_id uuid references auth.users on delete cascade primary key,
  is_comped boolean not null default false,
  comped_reason text,
  comped_until timestamptz,
  meals_created_lifetime integer not null default 0,
  favorites_created_lifetime integer not null default 0,
  qr_shares_lifetime integer not null default 0,
  qr_receives_lifetime integer not null default 0,
  active_product_ids jsonb not null default '[]'::jsonb,
  meals_slot_locked_at timestamptz,
  favorites_slot_locked_at timestamptz,
  downgrade_grace_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements enable row level security;

create policy "Users can view own entitlements" on public.user_entitlements
  for select using (auth.uid() = user_id);
-- Deliberately no insert/update policy: all writes happen through the
-- security definer RPCs below, never a raw client .update()/.insert().

create or replace function public.handle_new_user_entitlements()
returns trigger as $$
begin
  insert into public.user_entitlements (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created_entitlements
  after insert on auth.users
  for each row execute procedure public.handle_new_user_entitlements();

-- ============================================================
-- 2. Archive columns on meals / favorite_foods
-- ============================================================

alter table public.meals add column if not exists is_archived boolean not null default false;
alter table public.meals add column if not exists archived_at timestamptz;
alter table public.meals add column if not exists last_used_at timestamptz not null default now();

alter table public.favorite_foods add column if not exists is_archived boolean not null default false;
alter table public.favorite_foods add column if not exists archived_at timestamptz;
alter table public.favorite_foods add column if not exists last_used_at timestamptz not null default now();

create index if not exists meals_user_archived_idx on public.meals (user_id, is_archived);
create index if not exists favorite_foods_user_archived_idx on public.favorite_foods (user_id, is_archived);

-- ============================================================
-- 3. Coverage helper
-- ============================================================

create or replace function public.has_product(p_products jsonb, p_product text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_products ? p_product or p_products ? 'pro_bundle', false)
$$;

-- ============================================================
-- 4. Check-and-increment RPCs (the free-tier gates)
-- ============================================================

create or replace function public.check_and_increment_meal_created()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_entitlements%rowtype;
begin
  if v_user is null then return false; end if;

  insert into public.user_entitlements (user_id) values (v_user)
    on conflict (user_id) do nothing;
  select * into v_row from public.user_entitlements where user_id = v_user for update;

  if v_row.is_comped and (v_row.comped_until is null or v_row.comped_until > now()) then
    return true;
  end if;
  if public.has_product(v_row.active_product_ids, 'unlimited_meals_favorites') then
    return true;
  end if;
  if v_row.meals_created_lifetime >= 1 then
    return false;
  end if;

  update public.user_entitlements
    set meals_created_lifetime = meals_created_lifetime + 1, updated_at = now()
    where user_id = v_user;
  return true;
end;
$$;

create or replace function public.check_and_increment_favorite_created()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_entitlements%rowtype;
begin
  if v_user is null then return false; end if;

  insert into public.user_entitlements (user_id) values (v_user)
    on conflict (user_id) do nothing;
  select * into v_row from public.user_entitlements where user_id = v_user for update;

  if v_row.is_comped and (v_row.comped_until is null or v_row.comped_until > now()) then
    return true;
  end if;
  if public.has_product(v_row.active_product_ids, 'unlimited_meals_favorites') then
    return true;
  end if;
  if v_row.favorites_created_lifetime >= 5 then
    return false;
  end if;

  update public.user_entitlements
    set favorites_created_lifetime = favorites_created_lifetime + 1, updated_at = now()
    where user_id = v_user;
  return true;
end;
$$;

create or replace function public.check_and_increment_qr_share()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_entitlements%rowtype;
begin
  if v_user is null then return false; end if;

  insert into public.user_entitlements (user_id) values (v_user)
    on conflict (user_id) do nothing;
  select * into v_row from public.user_entitlements where user_id = v_user for update;

  if v_row.is_comped and (v_row.comped_until is null or v_row.comped_until > now()) then
    return true;
  end if;
  if public.has_product(v_row.active_product_ids, 'qr_sharing_unlimited') then
    return true;
  end if;
  if v_row.qr_shares_lifetime >= 1 then
    return false;
  end if;

  update public.user_entitlements
    set qr_shares_lifetime = qr_shares_lifetime + 1, updated_at = now()
    where user_id = v_user;
  return true;
end;
$$;

create or replace function public.check_and_increment_qr_receive()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_entitlements%rowtype;
begin
  if v_user is null then return false; end if;

  insert into public.user_entitlements (user_id) values (v_user)
    on conflict (user_id) do nothing;
  select * into v_row from public.user_entitlements where user_id = v_user for update;

  if v_row.is_comped and (v_row.comped_until is null or v_row.comped_until > now()) then
    return true;
  end if;
  if public.has_product(v_row.active_product_ids, 'qr_sharing_unlimited') then
    return true;
  end if;
  if v_row.qr_receives_lifetime >= 1 then
    return false;
  end if;

  update public.user_entitlements
    set qr_receives_lifetime = qr_receives_lifetime + 1, updated_at = now()
    where user_id = v_user;
  return true;
end;
$$;

grant execute on function public.check_and_increment_meal_created() to authenticated;
grant execute on function public.check_and_increment_favorite_created() to authenticated;
grant execute on function public.check_and_increment_qr_share() to authenticated;
grant execute on function public.check_and_increment_qr_receive() to authenticated;

-- ============================================================
-- 5. Swap-lock: block un-archiving while locked + uncovered
-- ============================================================

create or replace function public.guard_archive_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_entitlements%rowtype;
  v_locked_at timestamptz;
begin
  if new.is_archived = false and old.is_archived = true then
    if current_setting('app.bypass_archive_lock', true) = 'on' then
      return new;
    end if;

    select * into v_row from public.user_entitlements where user_id = old.user_id;

    if v_row.is_comped and (v_row.comped_until is null or v_row.comped_until > now()) then
      return new;
    end if;
    if public.has_product(v_row.active_product_ids, 'unlimited_meals_favorites') then
      return new;
    end if;

    if TG_TABLE_NAME = 'meals' then
      v_locked_at := v_row.meals_slot_locked_at;
    else
      v_locked_at := v_row.favorites_slot_locked_at;
    end if;

    if v_locked_at is not null then
      raise exception 'Cannot restore an archived item while your subscription is inactive';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_meals_archive_unlock on public.meals;
create trigger guard_meals_archive_unlock
  before update on public.meals
  for each row execute function public.guard_archive_unlock();

drop trigger if exists guard_favorites_archive_unlock on public.favorite_foods;
create trigger guard_favorites_archive_unlock
  before update on public.favorite_foods
  for each row execute function public.guard_archive_unlock();

-- ============================================================
-- 6. Downgrade picker RPCs
-- ============================================================

create or replace function public.select_active_meals(p_meal_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if array_length(p_meal_ids, 1) > 1 then
    raise exception 'Only 1 active meal is allowed on the free tier';
  end if;

  perform set_config('app.bypass_archive_lock', 'on', true);

  update public.meals set is_archived = true, archived_at = now()
    where user_id = v_user and is_archived = false and not (id = any(coalesce(p_meal_ids, array[]::uuid[])));
  update public.meals set is_archived = false, archived_at = null
    where user_id = v_user and id = any(coalesce(p_meal_ids, array[]::uuid[]));

  update public.user_entitlements set meals_slot_locked_at = now(), updated_at = now()
    where user_id = v_user;
end;
$$;

create or replace function public.select_active_favorites(p_favorite_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;
  if array_length(p_favorite_ids, 1) > 5 then
    raise exception 'Only 5 active favorites are allowed on the free tier';
  end if;

  perform set_config('app.bypass_archive_lock', 'on', true);

  update public.favorite_foods set is_archived = true, archived_at = now()
    where user_id = v_user and is_archived = false and not (id = any(coalesce(p_favorite_ids, array[]::uuid[])));
  update public.favorite_foods set is_archived = false, archived_at = null
    where user_id = v_user and id = any(coalesce(p_favorite_ids, array[]::uuid[]));

  update public.user_entitlements set favorites_slot_locked_at = now(), updated_at = now()
    where user_id = v_user;
end;
$$;

create or replace function public.restore_entitlement_archives()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  perform set_config('app.bypass_archive_lock', 'on', true);

  update public.meals set is_archived = false, archived_at = null
    where user_id = v_user and is_archived = true;
  update public.favorite_foods set is_archived = false, archived_at = null
    where user_id = v_user and is_archived = true;

  update public.user_entitlements
    set meals_slot_locked_at = null,
        favorites_slot_locked_at = null,
        downgrade_grace_expires_at = null,
        updated_at = now()
    where user_id = v_user;
end;
$$;

grant execute on function public.select_active_meals(uuid[]) to authenticated;
grant execute on function public.select_active_favorites(uuid[]) to authenticated;
grant execute on function public.restore_entitlement_archives() to authenticated;

-- Testing helper: simulates a subscription lapsing, since there is no real
-- billing provider wired up yet to fire a genuine expiry event. Safe to
-- leave in production - it only ever affects the caller's own row.
create or replace function public.trigger_downgrade_grace_for_testing()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Not authenticated'; end if;

  insert into public.user_entitlements (user_id, downgrade_grace_expires_at)
    values (v_user, now() + interval '3 days')
  on conflict (user_id) do update
    set downgrade_grace_expires_at = now() + interval '3 days',
        meals_slot_locked_at = null,
        favorites_slot_locked_at = null,
        updated_at = now();
end;
$$;

grant execute on function public.trigger_downgrade_grace_for_testing() to authenticated;

-- ============================================================
-- 7. Scheduled auto-resolve for expired, unselected downgrades
-- ============================================================

create extension if not exists pg_cron with schema extensions;

create or replace function public.auto_resolve_expired_downgrades()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_meal_id uuid;
  v_fav_ids uuid[];
begin
  for r in
    select * from public.user_entitlements
    where downgrade_grace_expires_at is not null
      and downgrade_grace_expires_at < now()
      and meals_slot_locked_at is null
      and favorites_slot_locked_at is null
  loop
    perform set_config('app.bypass_archive_lock', 'on', true);

    select id into v_meal_id from public.meals
      where user_id = r.user_id and is_archived = false
      order by last_used_at desc nulls last, created_at desc
      limit 1;

    select coalesce(array_agg(id), array[]::uuid[]) into v_fav_ids from (
      select id from public.favorite_foods
      where user_id = r.user_id and is_archived = false
      order by last_used_at desc nulls last, created_at desc
      limit 5
    ) s;

    update public.meals set is_archived = true, archived_at = now()
      where user_id = r.user_id and is_archived = false and (v_meal_id is null or id <> v_meal_id);
    update public.favorite_foods set is_archived = true, archived_at = now()
      where user_id = r.user_id and is_archived = false and not (id = any(v_fav_ids));

    update public.user_entitlements
      set meals_slot_locked_at = now(), favorites_slot_locked_at = now(), updated_at = now()
      where user_id = r.user_id;
  end loop;
end;
$$;

select cron.schedule(
  'auto-resolve-expired-downgrades',
  '*/15 * * * *',
  $$select public.auto_resolve_expired_downgrades()$$
);

-- ============================================================
-- 8. Comp your own accounts
-- ============================================================
-- Fill in your and your wife's emails and run this once:
--
-- update public.user_entitlements
--   set is_comped = true, comped_reason = 'founder account', comped_until = null
--   where user_id = (select id from auth.users where email = 'you@example.com');
--
-- update public.user_entitlements
--   set is_comped = true, comped_reason = 'founder account', comped_until = null
--   where user_id = (select id from auth.users where email = 'wife@example.com');
