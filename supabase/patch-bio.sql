-- Add profile bio (run once in Supabase SQL Editor)

alter table public.users
  add column if not exists bio text;
