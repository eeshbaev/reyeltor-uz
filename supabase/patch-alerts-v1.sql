-- =============================================================================
-- Reyeltor-uz: last-search alerts + price-drop alerts for favorites
-- =============================================================================
-- Run AFTER the other -v1 patches (included in apply-all-v1.sql). Safe to re-run.
--
-- 1. Last search: the filters a signed-in user last searched with on the map are kept as
--    one hidden saved search (kind = 'last'). It runs through the same matcher, daily cap
--    and digest as saved searches, does not count toward the 10-search limit, and can be
--    muted or saved permanently from Favorites → Searches.
-- 2. Price drops: each favorite remembers a reference price (alert_price, the price when
--    it was saved or last alerted). When the listing becomes at least 3% cheaper than that,
--    the owner of the favorite gets one push; the reference then moves to the new price.
--    Price increases raise the reference silently, so "cheaper than before" is what counts.
-- =============================================================================

-- 1. Last search ----------------------------------------------------------------
alter table public.saved_searches add column if not exists kind text not null default 'saved';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'saved_searches_kind_valid') then
    alter table public.saved_searches
      add constraint saved_searches_kind_valid check (kind in ('saved', 'last'));
  end if;
end $$;
create unique index if not exists saved_searches_one_last_per_user
  on public.saved_searches (user_id) where kind = 'last';

create or replace function public.guard_saved_search()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  new.name := btrim(new.name);
  if tg_op = 'INSERT' then
    if new.kind = 'saved' then
      perform pg_advisory_xact_lock(hashtext('saved_searches:' || new.user_id::text));
      select count(*) into v_count from public.saved_searches where user_id = new.user_id and kind = 'saved';
      if v_count >= 10 then
        raise exception 'saved_search_limit' using errcode = 'P0001';
      end if;
    end if;
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    -- "Save" turns the last search into a normal saved search (counts toward the limit).
    if old.kind = 'last' and new.kind = 'saved' then
      perform pg_advisory_xact_lock(hashtext('saved_searches:' || new.user_id::text));
      select count(*) into v_count from public.saved_searches where user_id = new.user_id and kind = 'saved';
      if v_count >= 10 then
        raise exception 'saved_search_limit' using errcode = 'P0001';
      end if;
    elsif new.kind is distinct from old.kind then
      new.kind := old.kind;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

/**
 * Remembers the user's latest map search. Returns the last-search id, or null when the
 * same filters are already a saved search (that one alerts already; no duplicate pushes).
 * Changing the filters drops alerts still queued for the previous filters.
 */
create or replace function public.set_last_search(p_filters jsonb, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_old jsonb;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if jsonb_typeof(p_filters) <> 'object' or p_filters ->> 'category' not in ('residential', 'commercial') then
    raise exception 'invalid_filters' using errcode = '22023';
  end if;

  if exists (select 1 from public.saved_searches where user_id = v_uid and kind = 'saved' and filters = p_filters) then
    delete from public.saved_searches where user_id = v_uid and kind = 'last';
    return null;
  end if;

  select id, filters into v_id, v_old from public.saved_searches where user_id = v_uid and kind = 'last';
  if v_id is null then
    insert into public.saved_searches (user_id, name, filters, kind)
    values (v_uid, left(coalesce(nullif(btrim(p_name), ''), 'Last search'), 60), p_filters, 'last')
    returning id into v_id;
  elsif v_old is distinct from p_filters then
    update public.saved_searches
    set filters = p_filters, name = left(coalesce(nullif(btrim(p_name), ''), 'Last search'), 60)
    where id = v_id;
    delete from public.saved_search_matches where search_id = v_id and status in ('pending', 'digest');
  end if;
  return v_id;
end;
$$;
revoke all on function public.set_last_search(jsonb, text) from public, anon;
grant execute on function public.set_last_search(jsonb, text) to authenticated;

-- The delivery job needs to know which matches come from the last search (different text).
drop function if exists public.claim_saved_search_matches(text, integer);
create or replace function public.claim_saved_search_matches(p_mode text, p_limit integer default 500)
returns table (
  match_id uuid,
  search_id uuid,
  search_name text,
  search_kind text,
  user_id uuid,
  listing_id uuid,
  listing_district text,
  locale text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
  v_to text;
begin
  if p_mode = 'instant' then
    v_from := 'pending'; v_to := 'sending';
  elsif p_mode = 'digest' then
    v_from := 'digest'; v_to := 'sending_digest';
  else
    raise exception 'unknown mode %', p_mode;
  end if;

  update public.saved_search_matches m
  set status = v_from, claimed_at = null
  where m.status = v_to and m.claimed_at < now() - interval '15 minutes';

  update public.saved_search_matches m
  set status = 'skipped', delivered_at = now()
  where m.status = v_from
    and (
      not exists (select 1 from public.saved_searches s where s.id = m.search_id and s.notify_enabled)
      or not exists (select 1 from public.listings l where l.id = m.listing_id and l.status = 'active')
    );

  -- A listing matching both a saved search and the last search is pushed once (saved wins).
  update public.saved_search_matches m
  set status = 'skipped', delivered_at = now()
  from public.saved_searches s
  where m.status = v_from and s.id = m.search_id and s.kind = 'last'
    and exists (
      select 1 from public.saved_search_matches o
      join public.saved_searches os on os.id = o.search_id and os.kind = 'saved'
      where o.user_id = m.user_id and o.listing_id = m.listing_id
    );

  return query
  with picked as (
    select m.id
    from public.saved_search_matches m
    where m.status = v_from
    order by m.matched_at
    limit p_limit
    for update skip locked
  ),
  claimed as (
    update public.saved_search_matches m
    set status = v_to, claimed_at = now()
    from picked
    where m.id = picked.id
    returning m.id, m.search_id, m.user_id, m.listing_id
  )
  select c.id, c.search_id, s.name, s.kind, c.user_id, c.listing_id, l.district,
         coalesce(np.locale, 'uz')
  from claimed c
  join public.saved_searches s on s.id = c.search_id
  join public.listings l on l.id = c.listing_id
  left join public.notification_preferences np on np.user_id = c.user_id;
end;
$$;
revoke all on function public.claim_saved_search_matches(text, integer) from public, anon, authenticated;
grant execute on function public.claim_saved_search_matches(text, integer) to service_role;

-- 2. Price drops on favorites ----------------------------------------------------
alter table public.favorites add column if not exists alert_price numeric;
update public.favorites f
set alert_price = l.price
from public.listings l
where l.id = f.listing_id and f.alert_price is null;

-- Not security definer: app users may read listings anyway, and is_app_user() must see them.
create or replace function public.set_favorite_alert_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    select price into new.alert_price from public.listings where id = new.listing_id;
  elsif reyeltor_private.is_app_user() then
    new.alert_price := old.alert_price; -- only the server moves the reference price
  end if;
  return new;
end;
$$;

drop trigger if exists set_favorite_alert_price on public.favorites;
create trigger set_favorite_alert_price
  before insert or update on public.favorites
  for each row execute function public.set_favorite_alert_price();

/**
 * Favorites whose listing is now at least p_min_drop cheaper than the reference price.
 * Moves each returned favorite's reference to the current price (so one drop = one push)
 * and raises references silently when prices went up. Server-only.
 */
create or replace function public.claim_price_drop_alerts(p_min_drop numeric default 0.03, p_limit integer default 1000)
returns table (
  user_id uuid,
  listing_id uuid,
  old_price numeric,
  new_price numeric,
  listing_district text,
  listing_type text,
  locale text,
  favorites_enabled boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Price went up: follow it, so a later drop is measured from the higher price.
  update public.favorites f
  set alert_price = l.price
  from public.listings l
  where l.id = f.listing_id and l.status = 'active' and f.alert_price is not null and l.price > f.alert_price;

  return query
  with drops as (
    select f.id as favorite_id, f.user_id, f.listing_id, f.alert_price as old_price, l.price::numeric as new_price,
           l.district, l.type::text as listing_type
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    where l.status = 'active'
      and l.user_id <> f.user_id
      and f.alert_price is not null
      and l.price <= f.alert_price * (1 - p_min_drop)
    order by f.id
    limit p_limit
    for update of f skip locked
  ),
  moved as (
    update public.favorites f
    set alert_price = d.new_price
    from drops d
    where f.id = d.favorite_id
    returning f.id
  )
  select d.user_id, d.listing_id, d.old_price, d.new_price, d.district, d.listing_type,
         coalesce(np.locale, 'uz'), coalesce(np.favorites_enabled, true)
  from drops d
  join moved m on m.id = d.favorite_id
  left join public.notification_preferences np on np.user_id = d.user_id;
end;
$$;
revoke all on function public.claim_price_drop_alerts(numeric, integer) from public, anon, authenticated;
grant execute on function public.claim_price_drop_alerts(numeric, integer) to service_role;
