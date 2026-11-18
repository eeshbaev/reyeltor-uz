-- =============================================================================
-- Reyeltor-uz: access model + Early Member status
-- =============================================================================
-- Run AFTER the other -v1 patches (included in apply-all-v1.sql). Safe to re-run.
--
-- 1. app_settings: one public, read-only row ('access') that tells the app how access works
--    today. Everything is free; there are no payments. The app reads it to show the About
--    screen and the Early Member badge. Only the owner (Dashboard / SQL) can change it.
-- 2. users.early_member_since: set by the server for everyone who joins while early access
--    is open. Nothing ends automatically: there is no deadline. To close early access later
--    (a real decision, announced in advance), run:
--      update public.app_settings
--      set value = value || '{"early_access_open": false}', updated_at = now()
--      where key = 'access';
--    People who already joined keep their status; app users can never change it.
-- =============================================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "Public settings are readable" on public.app_settings;
create policy "Public settings are readable" on public.app_settings
  for select to anon, authenticated
  using (key in ('access'));
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;

-- Default: early access, everything free. Never overwrites a value you changed.
insert into public.app_settings (key, value)
values ('access', '{"phase": "early_access", "pricing": "free", "early_access_open": true}')
on conflict (key) do nothing;

create or replace function reyeltor_private.early_access_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value->>'early_access_open')::boolean from public.app_settings where key = 'access'), false)
$$;
-- Callable from the users trigger when the app writes its own profile; it only returns a flag.
revoke all on function reyeltor_private.early_access_open() from public;
grant execute on function reyeltor_private.early_access_open() to anon, authenticated, service_role;

alter table public.users add column if not exists early_member_since timestamptz;

-- Everyone who joined before this patch joined during early access.
update public.users
set early_member_since = created_at
where early_member_since is null and reyeltor_private.early_access_open();

-- Not security definer on purpose: is_app_user() checks who is calling.
create or replace function public.set_early_member()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.early_member_since := case
      when reyeltor_private.early_access_open() then coalesce(new.created_at, now())
      else null
    end;
  elsif reyeltor_private.is_app_user() then
    new.early_member_since := old.early_member_since;
  end if;
  return new;
end;
$$;

drop trigger if exists set_early_member on public.users;
create trigger set_early_member
  before insert or update on public.users
  for each row execute function public.set_early_member();
