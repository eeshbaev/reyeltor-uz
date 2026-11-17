-- =============================================================================
-- Reyeltor-uz V1: server-side coin integrity + saved searches & match alerts
-- =============================================================================
-- Run in the Supabase SQL editor AFTER schema.sql and the existing patch-*.sql.
-- Safe to re-run.
--
-- Backward compatible with app builds <= 1.2.2:
--   * Old builds still write coin_balance / coin_transactions from the phone.
--     Those writes are now silently ignored; the server performs the real
--     charge (posting, reactivation) and reward (check-in) itself.
--   * Old builds still insert listings directly; the insert is charged here.
--
-- How "app user" is detected: PostgREST runs app requests as the database
-- role `authenticated` (or `anon`). Inside SECURITY DEFINER functions the
-- current_user is the function owner (postgres), so trusted server code is
-- never blocked by these guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Private schema for trusted helpers (not exposed through the REST API)
-- -----------------------------------------------------------------------------
create schema if not exists reyeltor_private;
revoke all on schema reyeltor_private from public;
grant usage on schema reyeltor_private to anon, authenticated, service_role;

create or replace function reyeltor_private.is_app_user()
returns boolean
language sql
stable
as $$
  select current_user in ('authenticated', 'anon');
$$;

-- Mirrors lib/coins.ts getCoinCost(). Keep both in sync.
create or replace function public.listing_post_cost(p_active_count integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_active_count, 0) <= 0 then 0
    when p_active_count < 10 then 5
    when p_active_count < 20 then 8
    when p_active_count < 30 then 15
    when p_active_count < 50 then 25
    else 40
  end;
$$;

-- Charge coins for posting or reactivating a listing. Raises when the balance
-- is too low, which aborts the whole insert/update.
create or replace function reyeltor_private.charge_listing(
  p_user_id uuid,
  p_listing_id uuid,
  p_type coin_type
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_active integer;
  v_cost integer;
begin
  -- Lock the user's row so concurrent posts are charged one after another.
  select coin_balance into v_balance from public.users where id = p_user_id for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0001';
  end if;

  select count(*) into v_active
  from public.listings
  where user_id = p_user_id and status = 'active' and id <> p_listing_id;

  v_cost := public.listing_post_cost(v_active);
  if v_cost <= 0 then
    return 0;
  end if;

  if coalesce(v_balance, 0) < v_cost then
    raise exception 'insufficient_coins'
      using errcode = 'P0001', detail = format('cost=%s balance=%s', v_cost, coalesce(v_balance, 0));
  end if;

  update public.users set coin_balance = coin_balance - v_cost where id = p_user_id;
  insert into public.coin_transactions (user_id, amount, type, listing_id)
  values (p_user_id, -v_cost, p_type, p_listing_id);
  return v_cost;
end;
$$;

create or replace function reyeltor_private.award_checkin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set coin_balance = coin_balance + 1 where id = p_user_id;
  insert into public.coin_transactions (user_id, amount, type) values (p_user_id, 1, 'checkin');
end;
$$;

revoke all on all functions in schema reyeltor_private from public;
grant execute on all functions in schema reyeltor_private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 1. Users: coin balance and agent statistics are server-owned
-- -----------------------------------------------------------------------------
alter table public.users add column if not exists purposes text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_purposes_valid') then
    alter table public.users
      add constraint users_purposes_valid
      check (purposes <@ array['investor', 'realtor', 'rent', 'buy']::text[]);
  end if;
end $$;

create or replace function public.guard_user_protected_columns()
returns trigger
language plpgsql
as $$
begin
  -- Trusted server code (security definer functions, triggers, dashboard) passes through.
  if not reyeltor_private.is_app_user() or pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.coin_balance := 15;
    new.total_posted := 0;
    new.total_rented := 0;
    new.total_sold := 0;
    new.total_expired := 0;
    new.avg_days_on_market := null;
    new.close_rate := null;
    new.referred_by := null;
  else
    -- Ignore (do not reject) client writes so old app builds keep working.
    new.coin_balance := old.coin_balance;
    new.total_posted := old.total_posted;
    new.total_rented := old.total_rented;
    new.total_sold := old.total_sold;
    new.total_expired := old.total_expired;
    new.avg_days_on_market := old.avg_days_on_market;
    new.close_rate := old.close_rate;
    new.referred_by := old.referred_by;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_protected_columns on public.users;
create trigger guard_user_protected_columns
  before insert or update on public.users
  for each row execute function public.guard_user_protected_columns();

-- Bug fix: round(double precision, integer) does not exist in Postgres, so the
-- previous version raised an error whenever a listing was marked rented/sold.
create or replace function public.update_agent_stats_on_archive()
returns trigger
language plpgsql
as $$
declare
  days_active float;
  current_closed integer;
  current_total integer;
begin
  if new.status = 'archived' and old.status = 'active' then
    if new.archived_reason = 'rented' then
      update users set total_rented = total_rented + 1 where id = new.user_id;
    elsif new.archived_reason = 'sold' then
      update users set total_sold = total_sold + 1 where id = new.user_id;
    elsif new.archived_reason = 'expired' then
      update users set total_expired = total_expired + 1 where id = new.user_id;
    end if;

    if new.archived_reason in ('rented', 'sold') then
      days_active := extract(epoch from (now() - new.posted_at)) / 86400;
      update users set
        avg_days_on_market = case
          when avg_days_on_market is null then days_active
          else (avg_days_on_market + days_active) / 2
        end
      where id = new.user_id;
    end if;

    select (total_rented + total_sold), total_posted
    into current_closed, current_total
    from users where id = new.user_id;

    if current_total > 0 then
      update users set
        close_rate = round((current_closed::numeric / current_total::numeric) * 100, 1)::float
      where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

-- Stats / engagement / moderation triggers must run with server rights.
-- (Previously they ran as the app user, so e.g. the 3-flag auto-archive could
-- not archive someone else's listing, and RLS could block engagement stats.)
alter function public.increment_total_posted() security definer set search_path = public;
alter function public.update_agent_stats_on_archive() security definer set search_path = public;
alter function public.log_price_change() security definer set search_path = public;
alter function public.check_flag_count() security definer set search_path = public;
alter function public.sync_listing_save_count() security definer set search_path = public;
alter function public.sync_listing_engagement_on_price_history() security definer set search_path = public;

-- -----------------------------------------------------------------------------
-- 2. Coin ledger: written by the server only
-- -----------------------------------------------------------------------------
drop policy if exists "Users update own balance via coins" on public.coin_transactions;

create or replace function public.drop_client_coin_transactions()
returns trigger
language plpgsql
as $$
begin
  -- Old app builds insert their own ledger rows; skip them silently.
  if reyeltor_private.is_app_user() and pg_trigger_depth() = 1 then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists drop_client_coin_transactions on public.coin_transactions;
create trigger drop_client_coin_transactions
  before insert on public.coin_transactions
  for each row execute function public.drop_client_coin_transactions();

-- Referral rewards: never trust a reward amount sent by the phone.
create or replace function public.process_referral_milestone(
  p_user_id uuid,
  p_event text,
  p_reward integer default 2
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_reward integer;
begin
  if p_user_id is null or p_event not in ('first_post', 'first_favorite') then
    return false;
  end if;

  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  -- Fixed server-side amounts (lib/constants.ts REFERRAL_* mirrors these).
  v_reward := case when p_event = 'first_post' then 2 else 1 end;

  select referred_by into v_referrer_id from users where id = p_user_id;
  if v_referrer_id is null then
    return false;
  end if;

  if p_event = 'first_post' and not exists (select 1 from listings where user_id = p_user_id) then
    return false;
  end if;

  if exists (
    select 1 from referral_events
    where referred_id = p_user_id and event_type = p_event
  ) then
    return false;
  end if;

  insert into referral_events (referrer_id, referred_id, event_type)
  values (v_referrer_id, p_user_id, p_event);

  update users set coin_balance = coin_balance + v_reward where id = v_referrer_id;

  insert into coin_transactions (user_id, amount, type)
  values (
    v_referrer_id,
    v_reward,
    case
      when p_event = 'first_post' then 'referral_first_post'::coin_type
      else 'referral_first_favorite'::coin_type
    end
  );

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Check-ins: Tue / Thu / Sat (Tashkent time), +1 coin, awarded by server
-- -----------------------------------------------------------------------------
drop policy if exists "Users manage own checkins" on public.checkin_log;
drop policy if exists "Users read own checkins" on public.checkin_log;
drop policy if exists "Users insert own checkins" on public.checkin_log;
create policy "Users read own checkins" on public.checkin_log
  for select using (auth.uid() = user_id);
create policy "Users insert own checkins" on public.checkin_log
  for insert with check (auth.uid() = user_id);

create or replace function public.process_checkin()
returns trigger
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'Asia/Tashkent')::date;
begin
  if reyeltor_private.is_app_user() then
    -- The app sends a UTC date; allow yesterday to cover 00:00–05:00 Tashkent.
    if new.checked_in_on < v_today - 1 or new.checked_in_on > v_today then
      raise exception 'checkin_invalid_date' using errcode = 'P0001';
    end if;
    if extract(dow from v_today) not in (2, 4, 6) then
      raise exception 'checkin_not_available_today' using errcode = 'P0001';
    end if;
    -- Check-in days are at least 2 days apart, so any claim within ±1 day is a repeat.
    if exists (
      select 1 from public.checkin_log
      where user_id = new.user_id
        and id <> new.id
        and checked_in_on between new.checked_in_on - 1 and new.checked_in_on + 1
    ) then
      raise exception 'checkin_already_claimed' using errcode = 'P0001';
    end if;
  end if;

  perform reyeltor_private.award_checkin(new.user_id);
  return new;
end;
$$;

drop trigger if exists process_checkin on public.checkin_log;
create trigger process_checkin
  after insert on public.checkin_log
  for each row execute function public.process_checkin();

-- -----------------------------------------------------------------------------
-- 4. Listings: server-side publishing rules, charging and protected fields
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'search_matched_at'
  ) then
    alter table public.listings add column search_matched_at timestamptz;
    -- Existing listings are not "new": never alert saved searches about them.
    update public.listings set search_matched_at = now();
  end if;
end $$;

create index if not exists listings_pending_match_idx
  on public.listings (posted_at)
  where search_matched_at is null and status = 'active';

create or replace function public.prepare_new_listing()
returns trigger
language plpgsql
as $$
declare
  v_recent integer;
begin
  if not reyeltor_private.is_app_user() then
    return new;
  end if;

  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'listing_owner_mismatch' using errcode = '42501';
  end if;

  -- Rate limit: protects saved-search subscribers from spam bursts.
  select count(*) into v_recent
  from public.listings
  where user_id = new.user_id and posted_at > now() - interval '24 hours';
  if v_recent >= 20 then
    raise exception 'listing_rate_limited' using errcode = 'P0001';
  end if;

  -- System-managed fields can never be chosen by the phone.
  new.status := 'active';
  new.archived_reason := null;
  new.archived_at := null;
  new.deletes_at := null;
  new.is_featured := false;
  new.view_count := 0;
  new.posted_at := now();
  new.last_edited_at := now();
  new.expires_at := now() + interval '90 days';
  new.search_matched_at := null;
  return new;
end;
$$;

drop trigger if exists prepare_new_listing on public.listings;
create trigger prepare_new_listing
  before insert on public.listings
  for each row execute function public.prepare_new_listing();

create or replace function public.charge_new_listing()
returns trigger
language plpgsql
as $$
begin
  if reyeltor_private.is_app_user() then
    perform reyeltor_private.charge_listing(new.user_id, new.id, 'post_cost');
  end if;
  return new;
end;
$$;

drop trigger if exists charge_new_listing on public.listings;
create trigger charge_new_listing
  after insert on public.listings
  for each row execute function public.charge_new_listing();

-- Named so it fires before on_listing_edited (BEFORE triggers run alphabetically).
create or replace function public.guard_listing_update()
returns trigger
language plpgsql
as $$
begin
  if not reyeltor_private.is_app_user() or pg_trigger_depth() > 1 then
    return new;
  end if;

  new.user_id := old.user_id;
  new.is_featured := old.is_featured;
  new.view_count := old.view_count;
  new.posted_at := old.posted_at;
  new.search_matched_at := old.search_matched_at;

  if new.status = 'active' and old.status is distinct from 'active' then
    if old.status = 'deleted' then
      raise exception 'listing_not_reactivatable' using errcode = 'P0001';
    end if;
    perform reyeltor_private.charge_listing(old.user_id, old.id, 'reactivation');
    new.archived_reason := null;
    new.archived_at := null;
    new.deletes_at := null;
    new.last_edited_at := now();
    new.expires_at := now() + interval '90 days';
  else
    -- Content edits still renew expiry through on_listing_edited.
    new.expires_at := old.expires_at;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_listing_update on public.listings;
create trigger guard_listing_update
  before update on public.listings
  for each row execute function public.guard_listing_update();

-- View counts: any visitor may count a view, nobody may set the number.
create or replace function public.increment_listing_view(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = p_listing_id and status = 'active';
$$;

revoke all on function public.increment_listing_view(uuid) from public;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Exchange rate used for USD-priced saved searches (listing prices are UZS)
-- -----------------------------------------------------------------------------
create table if not exists public.fx_rates (
  currency text primary key,
  uzs_per_unit numeric not null check (uzs_per_unit > 0),
  source text not null default 'cbu',
  updated_at timestamptz not null default now()
);

insert into public.fx_rates (currency, uzs_per_unit, source)
values ('USD', 12017, 'fallback')
on conflict (currency) do nothing;

alter table public.fx_rates enable row level security;
drop policy if exists "FX rates are publicly readable" on public.fx_rates;
create policy "FX rates are publicly readable" on public.fx_rates for select using (true);

-- -----------------------------------------------------------------------------
-- 6. Saved searches (the map filters are the source of truth)
-- -----------------------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  filters jsonb not null check (
    jsonb_typeof(filters) = 'object'
    and filters ->> 'category' in ('residential', 'commercial')
  ),
  notify_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_searches_user_idx on public.saved_searches (user_id);
create index if not exists saved_searches_notify_category_idx
  on public.saved_searches ((filters ->> 'category'))
  where notify_enabled;

alter table public.saved_searches enable row level security;
drop policy if exists "Users read own saved searches" on public.saved_searches;
drop policy if exists "Users insert own saved searches" on public.saved_searches;
drop policy if exists "Users update own saved searches" on public.saved_searches;
drop policy if exists "Users delete own saved searches" on public.saved_searches;
create policy "Users read own saved searches" on public.saved_searches
  for select using (auth.uid() = user_id);
create policy "Users insert own saved searches" on public.saved_searches
  for insert with check (auth.uid() = user_id);
create policy "Users update own saved searches" on public.saved_searches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own saved searches" on public.saved_searches
  for delete using (auth.uid() = user_id);

create or replace function public.guard_saved_search()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  new.name := btrim(new.name);
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtext('saved_searches:' || new.user_id::text));
    select count(*) into v_count from public.saved_searches where user_id = new.user_id;
    if v_count >= 10 then
      raise exception 'saved_search_limit' using errcode = 'P0001';
    end if;
    new.created_at := now();
  else
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_saved_search on public.saved_searches;
create trigger guard_saved_search
  before insert or update on public.saved_searches
  for each row execute function public.guard_saved_search();

-- One row per (saved search, new listing). Delivery state lives here.
create table if not exists public.saved_search_matches (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.saved_searches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'sending', 'pushed', 'digest', 'sending_digest', 'digested', 'skipped')
  ),
  matched_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  seen_at timestamptz,
  unique (search_id, listing_id)
);

create index if not exists saved_search_matches_status_idx
  on public.saved_search_matches (status, matched_at);
create index if not exists saved_search_matches_user_idx
  on public.saved_search_matches (user_id, matched_at desc);

alter table public.saved_search_matches enable row level security;
drop policy if exists "Users read own saved search matches" on public.saved_search_matches;
create policy "Users read own saved search matches" on public.saved_search_matches
  for select using (auth.uid() = user_id);

create or replace function public.mark_saved_search_seen(p_search_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.saved_search_matches
  set seen_at = now()
  where search_id = p_search_id and user_id = auth.uid() and seen_at is null;
$$;

revoke all on function public.mark_saved_search_seen(uuid) from public;
grant execute on function public.mark_saved_search_seen(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Deterministic matcher — mirrors applyClientFilters() in lib/filters.ts
-- -----------------------------------------------------------------------------
create or replace function public.filter_number(p_value text)
returns numeric
language sql
immutable
as $$
  select case
    when p_value is null then null
    when regexp_replace(p_value, '\s', '', 'g') ~ '^[0-9]+(\.[0-9]+)?$'
      then regexp_replace(p_value, '\s', '', 'g')::numeric
    else null
  end;
$$;

create or replace function public.normalize_property_type(p_value text)
returns text
language sql
immutable
as $$
  select case when p_value = 'condo' then 'condo_strata' else p_value end;
$$;

create or replace function public.listing_matches_saved_search(
  f jsonb,
  l public.listings,
  p_usd_rate numeric
)
returns boolean
language plpgsql
stable
as $$
declare
  v_category text := f ->> 'category';
  v_listing_category text := coalesce(
    l.category::text,
    case when l.type = 'lease' then 'commercial' else 'residential' end
  );
  v_transaction text;
  v_multiplier numeric := case when f ->> 'priceCurrency' = 'USD' then coalesce(p_usd_rate, 12017) else 1 end;
  v_number numeric;
  v_wanted_type text;
  v_listing_type text;
  v_haystack text;
  v_word text;
begin
  -- Drawn-area searches are not matched in V1.
  if jsonb_typeof(f -> 'mapArea') = 'object' then
    return false;
  end if;

  if v_category is distinct from v_listing_category then
    return false;
  end if;

  if v_category = 'residential' then
    v_transaction := nullif(f ->> 'residentialTransaction', '');
    if v_transaction = 'rent' and l.type <> 'rent' then return false; end if;
    if v_transaction = 'sale' and l.type <> 'buy' then return false; end if;
  else
    v_transaction := nullif(f ->> 'commercialTransaction', '');
    if v_transaction = 'lease' and l.type <> 'lease' then return false; end if;
    if v_transaction = 'sale' and l.type <> 'buy' then return false; end if;
  end if;

  v_number := public.filter_number(f ->> 'priceMin');
  if v_number > 0 and l.price < v_number * v_multiplier then return false; end if;
  v_number := public.filter_number(f ->> 'priceMax');
  if v_number > 0 and l.price > v_number * v_multiplier then return false; end if;

  if v_category = 'residential' then
    v_number := public.filter_number(f ->> 'roomsMin');
    if v_number is not null and l.rooms < v_number then return false; end if;

    v_number := public.filter_number(f ->> 'bathroomsMin');
    if v_number is not null and coalesce(l.bathrooms, 0) < v_number then return false; end if;

    if jsonb_typeof(f -> 'views') = 'array' and jsonb_array_length(f -> 'views') > 0 then
      if not (
        coalesce(l.property_views, '{}'::text[])
        && array(select jsonb_array_elements_text(f -> 'views'))
      ) then
        return false;
      end if;
    end if;

    if nullif(f ->> 'level', '') is not null and l.level is distinct from f ->> 'level' then
      return false;
    end if;
  end if;

  v_number := public.filter_number(f ->> 'areaMin');
  if v_number is not null and l.area_m2 < v_number then return false; end if;
  v_number := public.filter_number(f ->> 'areaMax');
  if v_number is not null and l.area_m2 > v_number then return false; end if;

  v_listing_type := public.normalize_property_type(coalesce(
    l.property_type,
    case when v_listing_category = 'residential' then 'residential' else 'office' end
  ));

  v_wanted_type := nullif(nullif(f ->> 'propertyType', ''), 'any');
  if v_wanted_type is not null and v_listing_type is distinct from public.normalize_property_type(v_wanted_type) then
    return false;
  end if;

  v_number := public.filter_number(f ->> 'yearBuiltMin');
  if v_number is not null and coalesce(l.year_built, 0) < v_number then return false; end if;
  v_number := public.filter_number(f ->> 'yearBuiltMax');
  if v_number is not null and coalesce(l.year_built, 9999) > v_number then return false; end if;

  if btrim(coalesce(f ->> 'keywords', '')) <> '' then
    v_haystack := lower(coalesce(l.description, '') || ' ' || l.district || ' ' || coalesce(v_listing_type, ''));
    for v_word in
      select w from regexp_split_to_table(lower(btrim(f ->> 'keywords')), '\s+') as w where w <> ''
    loop
      if position(v_word in v_haystack) = 0 then
        return false;
      end if;
    end loop;
  end if;

  if jsonb_typeof(f -> 'districts') = 'array' and jsonb_array_length(f -> 'districts') > 0 then
    if not (l.district in (select jsonb_array_elements_text(f -> 'districts'))) then
      return false;
    end if;
  end if;

  -- listedSinceDays is irrelevant: only brand-new listings are matched.
  return true;
end;
$$;

-- Finds new listings (with photos, or 30 min old) and records matches.
create or replace function public.enqueue_saved_search_matches(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate numeric;
  v_listing public.listings%rowtype;
  v_category text;
  v_inserted integer;
  v_total integer := 0;
begin
  select uzs_per_unit into v_rate from public.fx_rates where currency = 'USD';

  for v_listing in
    select l.*
    from public.listings l
    where l.search_matched_at is null
      and l.status = 'active'
      and l.posted_at <= now() - interval '2 minutes'
      and (
        exists (select 1 from public.listing_photos p where p.listing_id = l.id)
        or l.posted_at <= now() - interval '30 minutes'
      )
    order by l.posted_at
    limit p_limit
    for update of l skip locked
  loop
    v_category := coalesce(
      v_listing.category::text,
      case when v_listing.type = 'lease' then 'commercial' else 'residential' end
    );

    insert into public.saved_search_matches (search_id, user_id, listing_id)
    select s.id, s.user_id, v_listing.id
    from public.saved_searches s
    where s.notify_enabled
      and s.filters ->> 'category' = v_category
      and s.user_id <> v_listing.user_id
      and public.listing_matches_saved_search(s.filters, v_listing, v_rate)
    on conflict (search_id, listing_id) do nothing;

    get diagnostics v_inserted = row_count;
    v_total := v_total + v_inserted;

    update public.listings set search_matched_at = now() where id = v_listing.id;
  end loop;

  return v_total;
end;
$$;

-- Atomically claims matches for delivery. Matches whose search was switched off
-- or whose listing is no longer active are marked 'skipped' instead.
-- p_mode: 'instant' (pending -> sending) or 'digest' (digest -> sending_digest).
-- Dropped first: patch-alerts-v1.sql adds a column to the result (re-running must not fail).
drop function if exists public.claim_saved_search_matches(text, integer);
create or replace function public.claim_saved_search_matches(p_mode text, p_limit integer default 500)
returns table (
  match_id uuid,
  search_id uuid,
  search_name text,
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

  -- Recover rows stuck mid-delivery (e.g. the function crashed) after 15 minutes.
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
  select c.id, c.search_id, s.name, c.user_id, c.listing_id, l.district,
         coalesce(np.locale, 'uz')
  from claimed c
  join public.saved_searches s on s.id = c.search_id
  join public.listings l on l.id = c.listing_id
  left join public.notification_preferences np on np.user_id = c.user_id;
end;
$$;

revoke all on function public.enqueue_saved_search_matches(integer) from public, anon, authenticated;
revoke all on function public.claim_saved_search_matches(text, integer) from public, anon, authenticated;
revoke all on function public.listing_matches_saved_search(jsonb, public.listings, numeric) from public, anon, authenticated;
grant execute on function public.enqueue_saved_search_matches(integer) to service_role;
grant execute on function public.claim_saved_search_matches(text, integer) to service_role;
grant execute on function public.listing_matches_saved_search(jsonb, public.listings, numeric) to service_role;
