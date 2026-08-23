-- Run this in the Supabase SQL editor as an addition to schema.sql
--
-- Backs the configurable protein/fat ratios used by calculateMacroTargets()
-- (src/lib/macroCalc.ts). Defaults match the app's PROTEIN_PER_KG_RANGE /
-- FAT_PER_KG_RANGE defaults - keep them in sync if either changes.

alter table public.profiles add column if not exists protein_per_kg numeric not null default 1.6;
alter table public.profiles add column if not exists fat_per_kg numeric not null default 0.8;
