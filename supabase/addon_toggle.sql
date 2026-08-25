-- Run this in the Supabase SQL editor as an addition to monetization.sql
-- Lets a user activate/deactivate individual add-on products themselves,
-- one click each, from Settings - instead of the previous state where the
-- only way to grant an entitlement was hand-editing the row in the SQL
-- editor (see the "comp your own accounts" note at the bottom of
-- monetization.sql).
--
-- WARNING: no real billing provider is wired up yet (see the comment on
-- purchaseProduct() in src/lib/purchases.ts). These RPCs grant/revoke
-- entitlements immediately with NO payment check - any authenticated user
-- can unlock any product for free by calling them. That's acceptable for
-- now (pre-launch, dev/testing convenience) but MUST be locked down or
-- replaced with real purchase verification (RevenueCat receipt validation,
-- etc.) before this app has real users.

create or replace function public.activate_product(p_product_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return false; end if;
  if p_product_id not in (
    'remove_ads', 'unlimited_meals_favorites', 'qr_sharing_unlimited',
    'advanced_reports', 'all_themes', 'pro_bundle'
  ) then
    return false;
  end if;

  insert into public.user_entitlements (user_id) values (v_user)
    on conflict (user_id) do nothing;

  update public.user_entitlements
    set active_product_ids = case
          when active_product_ids ? p_product_id then active_product_ids
          else active_product_ids || to_jsonb(p_product_id)
        end,
        updated_at = now()
    where user_id = v_user;

  return true;
end;
$$;

create or replace function public.deactivate_product(p_product_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return false; end if;

  update public.user_entitlements
    set active_product_ids = active_product_ids - p_product_id,
        updated_at = now()
    where user_id = v_user;

  return true;
end;
$$;

grant execute on function public.activate_product(text) to authenticated;
grant execute on function public.deactivate_product(text) to authenticated;
