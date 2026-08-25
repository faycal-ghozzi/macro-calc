-- Run this in the Supabase SQL editor as an addition to monetization.sql
-- Free tier gets exactly one lifetime PDF report export from the Progress
-- tab; same check-and-increment pattern as check_and_increment_qr_share.

alter table public.user_entitlements add column if not exists reports_exported_lifetime integer not null default 0;

create or replace function public.check_and_increment_report_exported()
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
  if public.has_product(v_row.active_product_ids, 'advanced_reports') then
    return true;
  end if;
  if v_row.reports_exported_lifetime >= 1 then
    return false;
  end if;

  update public.user_entitlements
    set reports_exported_lifetime = reports_exported_lifetime + 1, updated_at = now()
    where user_id = v_user;
  return true;
end;
$$;

grant execute on function public.check_and_increment_report_exported() to authenticated;
