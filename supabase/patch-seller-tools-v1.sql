-- =============================================================================
-- Reyeltor-uz: seller tools — listing performance tracking
-- =============================================================================
-- Run AFTER patch-saved-searches-v1.sql and patch-listing-integrity-v1.sql. Safe to re-run.
--
-- * listing_events stores views (app + public web page), contact taps and shares.
--   Nobody can read or write it directly; only through the two functions below.
-- * record_listing_event(): counts an event at most once per viewer per 30 minutes,
--   never counts the owner's own activity, and only for active listings.
-- * get_listing_performance(): aggregated numbers for the listing's owner only.
-- =============================================================================

create table if not exists public.listing_events (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'web_view', 'contact_call', 'contact_message', 'share')),
  viewer_key text not null check (char_length(viewer_key) between 8 and 80),
  user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists listing_events_listing_idx
  on public.listing_events (listing_id, created_at desc);
create index if not exists listing_events_dedup_idx
  on public.listing_events (listing_id, event_type, viewer_key, created_at desc);

alter table public.listing_events enable row level security;
-- Intentionally no policies: access only via the security definer functions below.

create or replace function public.record_listing_event(
  p_listing_id uuid,
  p_event text,
  p_viewer_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
begin
  if p_event is null or p_event not in ('view', 'web_view', 'contact_call', 'contact_message', 'share') then
    return false;
  end if;
  if p_viewer_key is null or char_length(p_viewer_key) not between 8 and 80 then
    return false;
  end if;

  select user_id into v_owner from public.listings where id = p_listing_id and status = 'active';
  if not found then
    return false;
  end if;

  -- The owner looking at or sharing their own listing is not audience interest.
  if v_uid is not null and v_uid = v_owner then
    return false;
  end if;

  if exists (
    select 1 from public.listing_events
    where listing_id = p_listing_id
      and event_type = p_event
      and viewer_key = p_viewer_key
      and created_at > now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.listing_events (listing_id, event_type, viewer_key, user_id)
  values (p_listing_id, p_event, p_viewer_key, v_uid);

  if p_event in ('view', 'web_view') then
    update public.listings set view_count = coalesce(view_count, 0) + 1 where id = p_listing_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_listing_event(uuid, text, text) from public;
grant execute on function public.record_listing_event(uuid, text, text) to anon, authenticated;

create or replace function public.get_listing_performance(p_listing_id uuid)
returns table (
  views integer,
  unique_viewers integer,
  views_7d integer,
  web_views integer,
  contact_taps integer,
  contacts_7d integer,
  shares integer,
  favorites integer,
  favorites_7d integer,
  days_published integer,
  tracking_since timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.listings where id = p_listing_id and user_id = auth.uid()
  ) then
    raise exception 'not_listing_owner' using errcode = '42501';
  end if;

  return query
  select
    coalesce(l.view_count, 0)::integer,
    (select count(distinct e.viewer_key) from public.listing_events e
      where e.listing_id = l.id and e.event_type in ('view', 'web_view'))::integer,
    (select count(*) from public.listing_events e
      where e.listing_id = l.id and e.event_type in ('view', 'web_view')
        and e.created_at > now() - interval '7 days')::integer,
    (select count(*) from public.listing_events e
      where e.listing_id = l.id and e.event_type = 'web_view')::integer,
    (select count(*) from public.listing_events e
      where e.listing_id = l.id and e.event_type in ('contact_call', 'contact_message'))::integer,
    (select count(*) from public.listing_events e
      where e.listing_id = l.id and e.event_type in ('contact_call', 'contact_message')
        and e.created_at > now() - interval '7 days')::integer,
    (select count(*) from public.listing_events e
      where e.listing_id = l.id and e.event_type = 'share')::integer,
    (select count(*) from public.favorites f where f.listing_id = l.id)::integer,
    (select count(*) from public.favorites f
      where f.listing_id = l.id and f.saved_at > now() - interval '7 days')::integer,
    greatest(0, floor(extract(epoch from (now() - l.posted_at)) / 86400))::integer,
    (select min(e.created_at) from public.listing_events e where e.listing_id = l.id)
  from public.listings l
  where l.id = p_listing_id;
end;
$$;

revoke all on function public.get_listing_performance(uuid) from public, anon;
grant execute on function public.get_listing_performance(uuid) to authenticated;
