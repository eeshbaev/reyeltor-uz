-- Reyeltor-uz database schema
-- Fresh project: run this entire file once in Supabase SQL Editor.
-- If you get "relation already exists", use patch-existing.sql instead.

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  email text not null unique,
  phone_visible boolean not null default true,
  avatar_url text,
  bio text,
  telegram_username text,
  total_posted integer default 0,
  total_rented integer default 0,
  total_sold integer default 0,
  total_expired integer default 0,
  avg_days_on_market float default null,
  close_rate float default null,
  coin_balance integer default 15,
  referred_by uuid references users(id) on delete set null,
  last_active_at timestamptz default now(),
  created_at timestamptz default now()
);

create type listing_type as enum ('rent', 'buy', 'lease');
create type listing_category as enum ('residential', 'commercial');
create type listing_status as enum ('active', 'archived', 'deleted');
create type archived_reason as enum ('rented', 'sold', 'expired', 'manually_archived');

create table listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type listing_type not null,
  category listing_category default 'residential',
  property_type text,
  bathrooms smallint,
  year_built smallint,
  property_views text[] default '{}',
  level text,
  price integer not null,
  rooms smallint not null,
  area_m2 integer not null,
  floor smallint,
  total_floors smallint,
  district text not null,
  lat float8 not null,
  lng float8 not null,
  description text,
  status listing_status default 'active',
  archived_reason archived_reason default null,
  is_featured boolean default false,
  view_count integer default 0,
  posted_at timestamptz default now(),
  last_edited_at timestamptz default now(),
  expires_at timestamptz default now() + interval '90 days',
  archived_at timestamptz default null,
  deletes_at timestamptz default null
);

create table listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  order_index smallint not null
);

create table price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  old_price integer not null,
  new_price integer not null,
  changed_at timestamptz default now()
);

create type flag_reason as enum ('already_rented', 'wrong_price', 'fake_photos', 'duplicate');

create table flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  reason flag_reason not null,
  device_id text not null,
  created_at timestamptz default now(),
  unique(listing_id, device_id)
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  saved_at timestamptz default now(),
  unique(user_id, listing_id)
);

create type coin_type as enum (
  'welcome',
  'checkin',
  'post_cost',
  'reactivation',
  'referral_register',
  'referral_bonus',
  'referral_first_post',
  'referral_first_favorite'
);

create table coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount integer not null,
  type coin_type not null,
  listing_id uuid references listings(id) on delete set null,
  created_at timestamptz default now()
);

create table checkin_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  checked_in_on date not null,
  unique(user_id, checked_in_on)
);

create table referral_codes (
  user_id uuid primary key references users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz default now()
);

create table referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references users(id) on delete cascade,
  referred_id uuid not null references users(id) on delete cascade,
  event_type text not null check (event_type in ('register', 'first_post', 'first_favorite')),
  created_at timestamptz default now(),
  unique(referred_id, event_type)
);

create table listing_engagement_stats (
  listing_id uuid primary key references listings(id) on delete cascade,
  save_count integer not null default 0,
  price_drop_percent smallint,
  updated_at timestamptz default now()
);

alter table listing_engagement_stats enable row level security;

-- Triggers
create or replace function increment_total_posted()
returns trigger as $$
begin
  update users set total_posted = total_posted + 1 where id = new.user_id;
  return new;
end;
$$ language plpgsql;

create trigger on_listing_created
after insert on listings
for each row execute function increment_total_posted();

create or replace function update_agent_stats_on_archive()
returns trigger as $$
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
$$ language plpgsql;

create trigger on_listing_archived
after update on listings
for each row execute function update_agent_stats_on_archive();

create or replace function log_price_change()
returns trigger as $$
begin
  if new.price <> old.price then
    insert into price_history(listing_id, old_price, new_price)
    values (new.id, old.price, new.price);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_price_changed
after update on listings
for each row execute function log_price_change();

create or replace function sync_listing_engagement_on_price_history()
returns trigger as $$
begin
  if new.new_price < new.old_price then
    insert into listing_engagement_stats (listing_id, save_count, price_drop_percent)
    values (
      new.listing_id,
      0,
      round(((new.old_price - new.new_price)::float / new.old_price::float) * 100)::smallint
    )
    on conflict (listing_id) do update set
      price_drop_percent = excluded.price_drop_percent,
      updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_price_history_engagement
after insert on price_history
for each row execute function sync_listing_engagement_on_price_history();

create or replace function sync_listing_save_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into listing_engagement_stats (listing_id, save_count)
    values (new.listing_id, 1)
    on conflict (listing_id) do update set
      save_count = listing_engagement_stats.save_count + 1,
      updated_at = now();
  elsif tg_op = 'DELETE' then
    update listing_engagement_stats
    set save_count = greatest(save_count - 1, 0), updated_at = now()
    where listing_id = old.listing_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger on_favorite_engagement
after insert or delete on favorites
for each row execute function sync_listing_save_count();

create or replace function apply_referral_code(p_referred_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_reward integer := 2;
begin
  if p_referred_id is null or p_code is null or length(trim(p_code)) < 4 then
    return false;
  end if;

  if auth.uid() is distinct from p_referred_id then
    return false;
  end if;

  select user_id into v_referrer_id
  from referral_codes
  where upper(code) = upper(trim(p_code));

  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return false;
  end if;

  if exists (
    select 1 from referral_events
    where referred_id = p_referred_id and event_type = 'register'
  ) then
    return false;
  end if;

  if exists (select 1 from users where id = p_referred_id and referred_by is not null) then
    return false;
  end if;

  insert into referral_events (referrer_id, referred_id, event_type)
  values (v_referrer_id, p_referred_id, 'register');

  update users set referred_by = v_referrer_id where id = p_referred_id;
  update users set coin_balance = coin_balance + v_reward where id in (v_referrer_id, p_referred_id);

  insert into coin_transactions (user_id, amount, type)
  values
    (v_referrer_id, v_reward, 'referral_register'),
    (p_referred_id, v_reward, 'referral_register');

  return true;
end;
$$;

create or replace function process_referral_milestone(
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
begin
  if p_user_id is null or p_event not in ('first_post', 'first_favorite') then
    return false;
  end if;

  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  select referred_by into v_referrer_id from users where id = p_user_id;
  if v_referrer_id is null then
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

  update users set coin_balance = coin_balance + p_reward where id = v_referrer_id;

  insert into coin_transactions (user_id, amount, type)
  values (
    v_referrer_id,
    p_reward,
    case
      when p_event = 'first_post' then 'referral_first_post'::coin_type
      else 'referral_first_favorite'::coin_type
    end
  );

  return true;
end;
$$;

create or replace function reset_listing_expiry()
returns trigger as $$
begin
  new.last_edited_at := now();
  new.expires_at := now() + interval '90 days';
  return new;
end;
$$ language plpgsql;

create trigger on_listing_edited
before update on listings
for each row
when (old.description is distinct from new.description
  or old.price is distinct from new.price
  or old.rooms is distinct from new.rooms
  or old.area_m2 is distinct from new.area_m2
  or old.floor is distinct from new.floor
  or old.district is distinct from new.district)
execute function reset_listing_expiry();

create or replace function check_flag_count()
returns trigger as $$
declare
  flag_count integer;
begin
  select count(*) into flag_count from flags where listing_id = new.listing_id;
  if flag_count >= 3 then
    update listings set status = 'archived', archived_reason = 'manually_archived',
      archived_at = now(), deletes_at = now() + interval '30 days'
    where id = new.listing_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_flag_inserted
after insert on flags
for each row execute function check_flag_count();

-- Auto-create public profile when auth user is created (works with email confirmation).
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table users enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table price_history enable row level security;
alter table flags enable row level security;
alter table favorites enable row level security;
alter table coin_transactions enable row level security;
alter table checkin_log enable row level security;
alter table referral_codes enable row level security;
alter table referral_events enable row level security;
alter table listing_engagement_stats enable row level security;

create policy "Users are publicly readable" on users for select using (true);
create policy "Users can update own profile" on users for update using (auth.uid() = id);
create policy "Users can insert own profile" on users for insert with check (auth.uid() = id);

create policy "Listings are publicly readable" on listings for select using (true);
create policy "Users can insert own listings" on listings for insert with check (auth.uid() = user_id);
create policy "Users can update own listings" on listings for update using (auth.uid() = user_id);
create policy "Users can delete own listings" on listings for delete using (auth.uid() = user_id);

create policy "Photos are publicly readable" on listing_photos for select using (true);
create policy "Owners can manage photos" on listing_photos for all using (
  exists (select 1 from listings where listings.id = listing_photos.listing_id and listings.user_id = auth.uid())
);

create policy "Price history is publicly readable" on price_history for select using (true);

create policy "Signed-in users can report listings" on flags for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "Flags readable by poster" on flags for select using (
  user_id = auth.uid() or exists (
    select 1 from listings where listings.id = flags.listing_id and listings.user_id = auth.uid()
  )
);

create policy "Users manage own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own coin transactions" on coin_transactions for select using (auth.uid() = user_id);
create policy "Users insert own coin transactions" on coin_transactions for insert with check (auth.uid() = user_id);
create policy "Users update own balance via coins" on coin_transactions for update using (auth.uid() = user_id);

create policy "Users manage own checkins" on checkin_log for all using (auth.uid() = user_id);

create policy "Referral codes readable by owner" on referral_codes
  for select using (auth.uid() = user_id);
create policy "Referral codes insert own" on referral_codes
  for insert with check (auth.uid() = user_id);

create policy "Referral events readable by parties" on referral_events
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy "Engagement stats publicly readable" on listing_engagement_stats
  for select using (true);

-- Storage bucket (run separately in dashboard or via API)
-- Create bucket: reyeltor-listings (public read)

-- Cron jobs (enable pg_cron first)
-- select cron.schedule('archive-expired-listings', '0 2 * * *', $$
--   update listings set status = 'archived', archived_reason = 'expired',
--     archived_at = now(), deletes_at = now() + interval '30 days'
--   where status = 'active' and expires_at < now();
-- $$);

-- Notifications
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz default now(),
  unique (user_id, expo_push_token)
);

create table notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  listings_enabled boolean default true not null,
  favorites_enabled boolean default true not null,
  engagement_enabled boolean default true not null,
  checkin_enabled boolean default true not null,
  locale text default 'en' not null,
  updated_at timestamptz default now()
);

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table notification_dedup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  dedup_key text not null,
  sent_at timestamptz default now(),
  unique (user_id, dedup_key)
);

create index notification_log_user_created_idx on notification_log (user_id, created_at desc);
create index push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;
alter table notification_preferences enable row level security;
alter table notification_log enable row level security;
alter table notification_dedup enable row level security;

create policy "Users manage own push tokens" on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notification preferences" on notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own notification log" on notification_log
  for select using (auth.uid() = user_id);

create policy "Users update own notification log" on notification_log
  for update using (auth.uid() = user_id);

-- select cron.schedule('delete-archived-listings', '0 3 * * *', $$
--   delete from listings where status = 'archived' and deletes_at < now();
-- $$);
