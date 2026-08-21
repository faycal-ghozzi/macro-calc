-- Run this in the Supabase SQL editor as an addition to schema.sql
-- GDPR (RGPD) account deletion: soft delete with a 30-day grace period.
-- All tables reference auth.users on delete cascade, so purging the auth
-- user is enough to erase every row belonging to them.

alter table public.profiles add column if not exists deletion_requested_at timestamptz;

-- If this errors with a permissions message, enable pg_cron first via
-- Dashboard -> Database -> Extensions, then re-run this file.
create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_expired_deletions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users
  where id in (
    select id from public.profiles
    where deletion_requested_at is not null
      and deletion_requested_at < now() - interval '30 days'
  );
end;
$$;

select cron.schedule(
  'purge-expired-account-deletions',
  '0 3 * * *', -- daily at 03:00 UTC
  $$select public.purge_expired_deletions()$$
);
