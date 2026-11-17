-- Add phone visibility preference (run once in Supabase SQL Editor)

alter table public.users
  add column if not exists phone_visible boolean not null default true;
