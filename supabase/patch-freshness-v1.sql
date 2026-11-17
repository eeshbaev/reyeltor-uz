-- =============================================================================
-- Reyeltor-uz: listing freshness
-- =============================================================================
-- Run AFTER the other -v1 patches. Safe to re-run.
--
-- * availability_confirmed_at: when the owner last confirmed the property is still
--   available. Set by the server only: on publication, on reactivation, and through
--   confirm_listing_available(). The phone cannot write it directly.
-- * Confirming also renews the 90-day expiry, so actively confirmed listings stay up and
--   unconfirmed ones expire.
-- * archive_expired_listings(): archives listings past their expiry. Called by the daily
--   notification-jobs function (the old pg_cron example in schema.sql was commented out,
--   so expired listings were never archived).
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'availability_confirmed_at'
  ) then
    alter table public.listings add column availability_confirmed_at timestamptz;
    -- Existing listings: treat the last edit (or publication) as the last confirmation.
    update public.listings set availability_confirmed_at = coalesce(last_edited_at, posted_at, now());
  end if;
end $$;

-- Server-owned column: set on insert, kept on client updates (except reactivation).
create or replace function public.guard_availability_confirmed()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if reyeltor_private.is_app_user() or new.availability_confirmed_at is null then
      new.availability_confirmed_at := now();
    end if;
    return new;
  end if;

  if reyeltor_private.is_app_user() and pg_trigger_depth() = 1 then
    if new.status = 'active' and old.status is distinct from 'active' then
      new.availability_confirmed_at := now(); -- reactivating = confirming
    else
      new.availability_confirmed_at := old.availability_confirmed_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_availability_confirmed on public.listings;
create trigger guard_availability_confirmed
  before insert or update on public.listings
  for each row execute function public.guard_availability_confirmed();

create or replace function public.confirm_listing_available(p_listing_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmed timestamptz := now();
begin
  update public.listings
  set availability_confirmed_at = v_confirmed,
      expires_at = v_confirmed + interval '90 days'
  where id = p_listing_id
    and user_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'listing_not_confirmable' using errcode = 'P0001';
  end if;
  return v_confirmed;
end;
$$;

revoke all on function public.confirm_listing_available(uuid) from public, anon;
grant execute on function public.confirm_listing_available(uuid) to authenticated;

create or replace function public.archive_expired_listings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.listings
  set status = 'archived',
      archived_reason = 'expired',
      archived_at = now(),
      deletes_at = now() + interval '30 days'
  where status = 'active' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.archive_expired_listings() from public, anon, authenticated;
grant execute on function public.archive_expired_listings() to service_role;

-- The public listing page and seller cards may show the freshness date.
-- (Listings are already publicly readable; nothing else to grant.)
