-- =============================================================================
-- Reyeltor-uz: Telegram-verified registration + phone/password login
-- =============================================================================
-- Run AFTER the other -v1 patches (included in apply-all-v1.sql). Safe to re-run.
--
-- Registration now goes through the Telegram bot (supabase/functions/telegram-auth):
--   1. The app opens t.me/<bot>?start=<code>; the user taps "Share phone number" in the bot.
--      Telegram sends the bot the user's own phone number and name.
--   2. They choose a password; email is optional.
--   3. The server creates the account. Accounts without an email get an internal,
--      undeliverable sign-in address "tg<telegram id>@telegram.reyeltor.invalid" which is
--      never shown to anyone (the profile email stays empty).
-- Login: phone + password or email + password (checked by auth_password_login below).
-- Forgot password: re-confirm with Telegram, or the email reset link if an email is set.
--
-- This patch:
--   * users.email becomes optional; adds users.telegram_id and users.phone_verified_at
--   * app users cannot change telegram_id / phone_verified_at, or a Telegram-verified phone
--   * telegram_auth_flows: short-lived server-only state for each Telegram confirmation
--   * auth_login_attempts + auth_password_login(): password check with brute-force limits
--   * find_user_by_phone(): server-only phone lookup used by the function
-- =============================================================================

-- Placeholder sign-in addresses for accounts registered without an email.
create schema if not exists reyeltor_private;
create or replace function reyeltor_private.is_placeholder_email(p_email text)
returns boolean
language sql
immutable
as $$
  select coalesce(lower(p_email) like '%@telegram.reyeltor.invalid', false)
$$;

-- 1. Profile columns ------------------------------------------------------------
alter table public.users alter column email drop not null;
alter table public.users add column if not exists telegram_id bigint;
alter table public.users add column if not exists phone_verified_at timestamptz;
create unique index if not exists users_telegram_id_key on public.users (telegram_id) where telegram_id is not null;
-- Phone lookups by digits (login, duplicate checks).
create index if not exists users_phone_digits_idx on public.users ((regexp_replace(phone, '\D', '', 'g')));
create index if not exists users_email_lower_idx on public.users ((lower(email)));

-- Placeholder addresses never reach the profile.
update public.users set email = null where reyeltor_private.is_placeholder_email(email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := case when reyeltor_private.is_placeholder_email(new.email) then null else new.email end;
begin
  insert into public.users (id, full_name, phone, email, phone_visible, coin_balance)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'User'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_email,
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

-- Verified identity is set by the server only.
create or replace function public.guard_user_verified_identity()
returns trigger
language plpgsql
as $$
begin
  if not reyeltor_private.is_app_user() or pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.telegram_id := null;
    new.phone_verified_at := null;
  else
    new.telegram_id := old.telegram_id;
    new.phone_verified_at := old.phone_verified_at;
    -- Email changes go through Supabase's confirmation link (synced by sync_profile_email).
    new.email := old.email;
    -- A Telegram-verified phone can only change through a new Telegram confirmation.
    if old.phone_verified_at is not null then
      new.phone := old.phone;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_verified_identity on public.users;
create trigger guard_user_verified_identity
  before insert or update on public.users
  for each row execute function public.guard_user_verified_identity();

-- 2. Telegram confirmation flows (server-only) -----------------------------------
create table if not exists public.telegram_auth_flows (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('register', 'reset')),
  secret_hash text not null,
  start_code text not null unique,
  locale text not null default 'uz',
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'phone_taken', 'no_phone', 'not_registered', 'cancelled', 'failed', 'consumed')),
  telegram_id bigint,
  telegram_username text,
  phone text,
  first_name text,
  last_name text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  completed_at timestamptz
);
create index if not exists telegram_auth_flows_tg_idx on public.telegram_auth_flows (telegram_id, created_at desc);
create index if not exists telegram_auth_flows_expires_idx on public.telegram_auth_flows (expires_at);
alter table public.telegram_auth_flows enable row level security;
revoke all on public.telegram_auth_flows from anon, authenticated;

-- 3. Phone lookup (server-only) ----------------------------------------------------
-- Matches "+998 90 123-45-67", "998901234567" and "901234567" (Uzbek local) alike.
create or replace function public.find_user_by_phone(p_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with d as (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as digits)
  select u.id
  from public.users u, d
  where length(d.digits) >= 9
    and regexp_replace(u.phone, '\D', '', 'g') in (d.digits, case when length(d.digits) = 9 then '998' || d.digits end)
  order by u.phone_verified_at desc nulls last, u.created_at
  limit 1
$$;
revoke all on function public.find_user_by_phone(text) from public, anon, authenticated;
grant execute on function public.find_user_by_phone(text) to service_role;

-- is_phone_registered (patch-hardening) now uses the same matching.
create or replace function public.is_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.find_user_by_phone(p_phone) is not null
$$;
revoke all on function public.is_phone_registered(text) from public;
grant execute on function public.is_phone_registered(text) to anon, authenticated;

-- 4. Password login with brute-force limits (server-only) ------------------------
create table if not exists public.auth_login_attempts (
  id bigint generated always as identity primary key,
  identifier text not null,
  ip text,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists auth_login_attempts_identifier_idx on public.auth_login_attempts (identifier, attempted_at desc);
create index if not exists auth_login_attempts_ip_idx on public.auth_login_attempts (ip, attempted_at desc);
alter table public.auth_login_attempts enable row level security;
revoke all on public.auth_login_attempts from anon, authenticated;

-- Returns the user id when the password is right. Never raises for bad input, so the
-- attempt row is always kept. Status: ok | invalid_credentials | too_many_attempts.
create or replace function public.auth_password_login(p_identifier text, p_password text, p_ip text default null)
returns table (user_id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := trim(coalesce(p_identifier, ''));
  v_is_email boolean := position('@' in v_raw) > 0;
  v_key text;
  v_user uuid;
  v_ok boolean := false;
begin
  v_key := case when v_is_email then lower(v_raw) else regexp_replace(v_raw, '\D', '', 'g') end;
  if length(v_key) = 9 and not v_is_email then
    v_key := '998' || v_key;
  end if;

  if (select count(*) from public.auth_login_attempts a
      where a.identifier = v_key and not a.success and a.attempted_at > now() - interval '15 minutes') >= 5
     or (p_ip is not null and (select count(*) from public.auth_login_attempts a
      where a.ip = p_ip and not a.success and a.attempted_at > now() - interval '15 minutes') >= 30) then
    return query select null::uuid, 'too_many_attempts'::text;
    return;
  end if;

  if v_is_email then
    select u.id into v_user from public.users u where lower(u.email) = v_key limit 1;
    if v_user is null then
      select au.id into v_user from auth.users au where lower(au.email) = v_key limit 1;
    end if;
  elsif length(v_key) >= 9 then
    v_user := public.find_user_by_phone(v_key);
  end if;

  if v_user is not null and coalesce(p_password, '') <> '' then
    select coalesce(au.encrypted_password = extensions.crypt(p_password, au.encrypted_password), false)
      into v_ok
    from auth.users au
    where au.id = v_user
      and coalesce(au.encrypted_password, '') <> ''
      and (au.banned_until is null or au.banned_until < now());
    v_ok := coalesce(v_ok, false);
  end if;

  insert into public.auth_login_attempts (identifier, ip, success) values (v_key, p_ip, v_ok);
  -- Housekeeping: keep a day of history.
  delete from public.auth_login_attempts where attempted_at < now() - interval '1 day';

  if v_ok then
    return query select v_user, 'ok'::text;
  else
    return query select null::uuid, 'invalid_credentials'::text;
  end if;
end;
$$;
revoke all on function public.auth_password_login(text, text, text) from public, anon, authenticated;
grant execute on function public.auth_password_login(text, text, text) to service_role;
