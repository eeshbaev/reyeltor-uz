-- =============================================================================
-- Reyeltor-uz: listing integrity — duplicate detection at publication
-- =============================================================================
-- Run AFTER patch-saved-searches-v1.sql. Safe to re-run.
--
-- The app calls find_similar_own_listings() before publishing. If the user already
-- has an active listing that looks like the same property, the app offers to update
-- it instead. It never blocks: similar-but-different properties (two flats in the
-- same building) can still be published.
-- =============================================================================

create or replace function public.find_similar_own_listings(
  p_type listing_type,
  p_category text,
  p_property_type text,
  p_price integer,
  p_area_m2 integer,
  p_lat float8,
  p_lng float8,
  p_rooms smallint default null
)
returns table (
  id uuid,
  price integer,
  area_m2 integer,
  rooms smallint,
  district text,
  posted_at timestamptz,
  distance_m float8
)
language sql
stable
security invoker
set search_path = public
as $$
  with candidates as (
    select
      l.id, l.price, l.area_m2, l.rooms, l.district, l.posted_at,
      -- Haversine distance in metres.
      6371000 * 2 * asin(least(1, sqrt(
        power(sin(radians(l.lat - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - p_lng) / 2), 2)
      ))) as distance_m
    from public.listings l
    where l.user_id = auth.uid()
      and l.status = 'active'
      and l.type = p_type
      and coalesce(l.category::text, case when l.type = 'lease' then 'commercial' else 'residential' end) = p_category
      and (
        p_property_type is null
        or public.normalize_property_type(coalesce(l.property_type, p_property_type))
           = public.normalize_property_type(p_property_type)
      )
      and (p_rooms is null or p_rooms = 0 or l.rooms = p_rooms)
      -- Same size within 7% (min 3 m²) and price within 15%: owners re-post with small changes.
      and abs(l.area_m2 - p_area_m2) <= greatest(3, p_area_m2 * 0.07)
      and abs(l.price - p_price) <= p_price * 0.15
  )
  select c.id, c.price, c.area_m2, c.rooms, c.district, c.posted_at, c.distance_m
  from candidates c
  where c.distance_m <= 150
  order by c.distance_m, c.posted_at desc
  limit 3;
$$;

revoke all on function public.find_similar_own_listings(listing_type, text, text, integer, integer, float8, float8, smallint) from public, anon;
grant execute on function public.find_similar_own_listings(listing_type, text, text, integer, integer, float8, float8, smallint) to authenticated;
