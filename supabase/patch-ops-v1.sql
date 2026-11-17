-- =============================================================================
-- Reyeltor-uz: operations — error log, registration rate limit, verified email sync
-- =============================================================================
-- Run AFTER the other -v1 patches (included in apply-all-v1.sql). Safe to re-run.
--
-- 1. app_errors: crashes and logged errors from the app when no Sentry key is set
--    (lib/logging/remoteErrors.ts). Insert-only for the app; read it in the Dashboard
--    (Table Editor → app_errors). Rows older than 30 days are removed by the daily job.
-- 2. Telegram registration rate limit: starts are counted per client IP (stored hashed).
-- 3. Verified emails: the profile email now follows the *confirmed* sign-in email. Users
--    change their email through Supabase's confirmation link; once they click it, this
--    trigger copies it to the profile (placeholder Telegram addresses stay hidden).
-- =============================================================================

-- 1. Error log ---------------------------------------------------------------------
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  level text not null default 'error' check (level in ('error', 'fatal')),
  message text not null check (char_length(message) <= 500),
  context text check (char_length(context) <= 100),
  stack text check (char_length(stack) <= 4000),
  extra jsonb check (extra is null or pg_column_size(extra) <= 8000),
  platform text check (char_length(platform) <= 40),
  app_version text check (char_length(app_version) <= 20)
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
drop policy if exists "App can report errors" on public.app_errors;
create policy "App can report errors" on public.app_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
revoke all on public.app_errors from anon, authenticated;
grant insert (level, message, context, stack, extra, platform, app_version, user_id) on public.app_errors to anon, authenticated;

-- Basic flood protection: at most 300 reports per minute in total.
create or replace function public.limit_app_errors()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.app_errors where created_at > now() - interval '1 minute') >= 300 then
    return null; -- silently drop
  end if;
  return new;
end;
$$;
drop trigger if exists limit_app_errors on public.app_errors;
create trigger limit_app_errors before insert on public.app_errors
  for each row execute function public.limit_app_errors();

create or replace function public.purge_old_app_errors()
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (delete from public.app_errors where created_at < now() - interval '30 days' returning 1)
  select count(*)::integer from gone
$$;
revoke all on function public.purge_old_app_errors() from public, anon, authenticated;
grant execute on function public.purge_old_app_errors() to service_role;

-- 2. Registration rate limit (used by supabase/functions/telegram-auth) ------------------
alter table public.telegram_auth_flows add column if not exists client_ip_hash text;
create index if not exists telegram_auth_flows_ip_idx on public.telegram_auth_flows (client_ip_hash, created_at desc);

-- 3. Profile email follows the confirmed sign-in email -------------------------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    -- A confirmed address wins over the same address typed (unverified) into another profile.
    if not reyeltor_private.is_placeholder_email(new.email) then
      update public.users set email = null where lower(email) = lower(new.email) and id <> new.id;
    end if;
    update public.users
    set email = case when reyeltor_private.is_placeholder_email(new.email) then null else new.email end
    where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
