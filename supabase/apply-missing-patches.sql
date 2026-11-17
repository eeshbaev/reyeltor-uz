-- Run once in Supabase SQL Editor when the live project is behind schema.sql.
-- Fixes: phone_visible column + notification_preferences / push_tokens tables.

-- --- patch-phone-visibility ---
alter table public.users
  add column if not exists phone_visible boolean not null default true;

-- --- patch-notifications (tables, RLS, trigger) ---
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz default now(),
  unique (user_id, expo_push_token)
);

create table if not exists notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  listings_enabled boolean default true not null,
  favorites_enabled boolean default true not null,
  engagement_enabled boolean default true not null,
  checkin_enabled boolean default true not null,
  locale text default 'en' not null,
  updated_at timestamptz default now()
);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists notification_dedup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  dedup_key text not null,
  sent_at timestamptz default now(),
  unique (user_id, dedup_key)
);

create index if not exists notification_log_user_created_idx
  on notification_log (user_id, created_at desc);

create index if not exists push_tokens_user_idx on push_tokens (user_id);

insert into notification_preferences (user_id, locale)
select id, 'en' from users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone, email, phone_visible, coin_balance)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'phone_visible')::boolean, true),
    15
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id, locale)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'en'))
  on conflict (user_id) do nothing;

  if not exists (
    select 1 from public.coin_transactions
    where user_id = new.id and type = 'welcome'
  ) then
    insert into public.coin_transactions (user_id, amount, type)
    values (new.id, 15, 'welcome');
  end if;

  return new;
end;
$$;

alter table push_tokens enable row level security;
alter table notification_preferences enable row level security;
alter table notification_log enable row level security;
alter table notification_dedup enable row level security;

drop policy if exists "Users manage own push tokens" on push_tokens;
create policy "Users manage own push tokens" on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own notification preferences" on notification_preferences;
create policy "Users manage own notification preferences" on notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users read own notification log" on notification_log;
create policy "Users read own notification log" on notification_log
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notification log" on notification_log;
create policy "Users update own notification log" on notification_log
  for update using (auth.uid() = user_id);
