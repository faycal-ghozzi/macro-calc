-- Run this in the Supabase SQL editor as an addition to schema.sql
-- Moves onboarding-tour "seen" state from device-local storage to the
-- account's own profile row, so it's scoped correctly per account instead
-- of per device (a new account on a device that's run the app before no
-- longer inherits a stale "already seen" flag from a previous account).

alter table public.profiles add column if not exists has_seen_first_login_tour boolean not null default false;
alter table public.profiles add column if not exists seen_feature_tips jsonb not null default '{}'::jsonb;

-- No RPC needed: "Users can update own profile" (schema.sql) already
-- permits a direct client update/upsert on these columns for their own row.
