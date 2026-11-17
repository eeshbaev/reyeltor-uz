-- =============================================================================
-- Reyeltor-uz: security hardening (audit fixes)
-- =============================================================================
-- Run AFTER the other -v1 patches (included in apply-all-v1.sql). Safe to re-run.
--
-- 1. Reports (flags): only signed-in users, one report per account per listing, and
--    a listing is auto-archived only after 3 DIFFERENT accounts (not the owner, each
--    at least 1 day old) report it. Before: anyone could send 3 reports with made-up
--    device ids and take any listing down.
-- 2. Photo storage: users can upload, replace and delete files only in folders of
--    their own listings (avatars keep their own per-user rules). Before: any signed-in
--    user could overwrite or delete anyone's photos.
-- 3. Account deletion: delete_my_account() really deletes the account (auth user,
--    profile, listings, favorites, coins, searches). Before: RLS silently blocked
--    deleting the profile, so "Delete all data" left the account in place.
-- 4. purge_deleted_listings(): removes archived listings 30 days after archiving,
--    as the app promises. Called by the daily notification-jobs function, which
--    first removes their photo files from storage.
-- 5. Email visibility: sellers can hide their email from buyers (users.email_visible).
-- 6. is_phone_registered(): lets sign-up say "this phone is already registered" before
--    creating the account (otherwise Supabase only reports "Database error saving new user").
-- 7. Ratings tables (if installed): no self-ratings, review reports private, reporter recorded.
-- =============================================================================

-- 1. Reports ------------------------------------------------------------------
drop policy if exists "Anyone can flag listings" on public.flags;
drop policy if exists "Signed-in users can report listings" on public.flags;
create policy "Signed-in users can report listings" on public.flags
  for insert with check (auth.uid() is not null and user_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'flags_listing_user_uniq') then
    begin
      create unique index flags_listing_user_uniq on public.flags (listing_id, user_id) where user_id is not null;
    exception when unique_violation then
      raise notice 'flags_listing_user_uniq not created: existing duplicate reports. Clean them up and re-run.';
    end;
  end if;
end $$;

create or replace function public.check_flag_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_reporters integer;
begin
  select user_id into v_owner from listings where id = new.listing_id;

  select count(distinct f.user_id) into v_reporters
  from flags f
  join users u on u.id = f.user_id
  where f.listing_id = new.listing_id
    and f.user_id is not null
    and f.user_id is distinct from v_owner
    and u.created_at < now() - interval '1 day';

  if v_reporters >= 3 then
    update listings set status = 'archived', archived_reason = 'manually_archived',
      archived_at = now(), deletes_at = now() + interval '30 days'
    where id = new.listing_id and status = 'active';
  end if;
  return new;
end;
$$;

create index if not exists flags_listing_idx on public.flags (listing_id);

-- 2. Photo storage --------------------------------------------------------------
drop policy if exists "Authenticated upload reyeltor listings bucket" on storage.objects;
drop policy if exists "Authenticated update reyeltor listings bucket" on storage.objects;
drop policy if exists "Authenticated delete reyeltor listings bucket" on storage.objects;
drop policy if exists "Owners upload listing photos" on storage.objects;
drop policy if exists "Owners update listing photos" on storage.objects;
drop policy if exists "Owners delete listing photos" on storage.objects;

-- Listing photos live at "<listing id>/<file>". Text comparison avoids cast errors on other folders.
create policy "Owners upload listing photos" on storage.objects
  for insert with check (
    bucket_id = 'reyeltor-listings'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid()
    )
  );
create policy "Owners update listing photos" on storage.objects
  for update using (
    bucket_id = 'reyeltor-listings'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid()
    )
  );
create policy "Owners delete listing photos" on storage.objects
  for delete using (
    bucket_id = 'reyeltor-listings'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[1] and l.user_id = auth.uid()
    )
  );

-- 3. Account deletion -------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  -- Cascades: users -> listings (-> photos rows, price history, flags, matches, events),
  -- favorites, coin ledger, check-ins, saved searches, push tokens, notification rows.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 4. Purge archived listings after their 30-day grace period --------------------
create or replace function public.purge_deleted_listings(p_limit integer default 500)
returns table (listing_id uuid, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with doomed as (
    select l.id from public.listings l
    where l.status = 'archived' and l.deletes_at is not null and l.deletes_at < now()
    order by l.deletes_at
    limit p_limit
  ),
  photos as (
    select p.listing_id, p.storage_path
    from public.listing_photos p
    join doomed d on d.id = p.listing_id
  ),
  gone as (
    delete from public.listings l using doomed d where l.id = d.id returning l.id
  )
  select ph.listing_id, ph.storage_path from photos ph;
end;
$$;

revoke all on function public.purge_deleted_listings(integer) from public, anon, authenticated;
grant execute on function public.purge_deleted_listings(integer) to service_role;

-- Foreign-key indexes Postgres does not create automatically (map, detail and favorites queries).
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_user_status_idx on public.listings (user_id, status);
create index if not exists listing_photos_listing_idx on public.listing_photos (listing_id);
create index if not exists favorites_listing_idx on public.favorites (listing_id);
create index if not exists price_history_listing_idx on public.price_history (listing_id);

-- 5. Email visibility ------------------------------------------------------------
alter table public.users add column if not exists email_visible boolean not null default true;

create or replace view public.public_profiles
with (security_barrier = true)
as
select
  u.id,
  u.full_name,
  u.avatar_url,
  u.bio,
  u.telegram_username,
  case when u.email_visible then u.email else null end as email,
  case when u.phone_visible then u.phone else null end as phone,
  u.phone_visible,
  u.total_posted,
  u.total_rented,
  u.total_sold,
  u.total_expired,
  u.avg_days_on_market,
  u.close_rate,
  u.created_at,
  u.last_active_at,
  u.email_visible
from public.users u
where exists (select 1 from public.listings l where l.user_id = u.id);

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- 6. Phone availability for sign-up ---------------------------------------------
create or replace function public.is_phone_registered(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 9
     and exists (
       select 1 from public.users u
       where right(regexp_replace(u.phone, '\D', '', 'g'), 9) = right(regexp_replace(p_phone, '\D', '', 'g'), 9)
     );
$$;
revoke all on function public.is_phone_registered(text) from public;
grant execute on function public.is_phone_registered(text) to anon, authenticated;

-- 7. Ratings (optional feature; only if migrations/002 was applied) ----------------
do $$
begin
  if to_regclass('public.ratings') is not null then
    drop policy if exists "Users can create their own ratings" on public.ratings;
    create policy "Users can create their own ratings" on public.ratings
      for insert with check (
        auth.uid() = user_id
        and target_id <> auth.uid()
        and not exists (
          select 1 from public.listings l where l.id = target_id and l.user_id = auth.uid()
        )
      );
    drop policy if exists "Users can update their own ratings" on public.ratings;
    create policy "Users can update their own ratings" on public.ratings
      for update using (auth.uid() = user_id)
      with check (auth.uid() = user_id and target_id <> auth.uid());
  end if;

  if to_regclass('public.review_reports') is not null then
    alter table public.review_reports add column if not exists reporter_id uuid references auth.users(id) on delete set null default auth.uid();
    drop policy if exists "Anyone can view review reports" on public.review_reports;
    drop policy if exists "Reporters can view own review reports" on public.review_reports;
    create policy "Reporters can view own review reports" on public.review_reports
      for select using (reporter_id = auth.uid());
    drop policy if exists "Users can create review reports" on public.review_reports;
    create policy "Users can create review reports" on public.review_reports
      for insert with check (auth.uid() is not null and reporter_id = auth.uid());
  end if;
end $$;
