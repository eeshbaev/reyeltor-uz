-- =============================================================================
-- Reyeltor-uz: prerequisites for the -v1 patches (runs first in apply-all-v1.sql)
-- =============================================================================
-- Older databases may have skipped some early patches (avatar, bio, phone visibility,
-- growth...). This adds every column the later patches and the app rely on, if missing.
-- Safe to re-run; never drops or changes existing data.
-- =============================================================================

alter table public.users add column if not exists phone_visible boolean not null default true;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists telegram_username text;
alter table public.users add column if not exists total_posted integer default 0;
alter table public.users add column if not exists total_rented integer default 0;
alter table public.users add column if not exists total_sold integer default 0;
alter table public.users add column if not exists total_expired integer default 0;
alter table public.users add column if not exists avg_days_on_market float default null;
alter table public.users add column if not exists close_rate float default null;
alter table public.users add column if not exists coin_balance integer default 15;
alter table public.users add column if not exists referred_by uuid references public.users(id) on delete set null;
alter table public.users add column if not exists last_active_at timestamptz default now();
alter table public.users add column if not exists created_at timestamptz default now();

alter table public.listings add column if not exists property_type text;
alter table public.listings add column if not exists bathrooms smallint;
alter table public.listings add column if not exists year_built smallint;
alter table public.listings add column if not exists property_views text[] default '{}';
alter table public.listings add column if not exists level text;
alter table public.listings add column if not exists floor smallint;
alter table public.listings add column if not exists total_floors smallint;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists is_featured boolean default false;
alter table public.listings add column if not exists view_count integer default 0;
alter table public.listings add column if not exists posted_at timestamptz default now();
alter table public.listings add column if not exists last_edited_at timestamptz default now();
alter table public.listings add column if not exists expires_at timestamptz default now() + interval '90 days';
alter table public.listings add column if not exists archived_at timestamptz default null;
alter table public.listings add column if not exists deletes_at timestamptz default null;
