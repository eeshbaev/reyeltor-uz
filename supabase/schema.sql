-- Reyeltor.uz database schema
-- Run in Supabase SQL editor in order

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null unique,
  email text not null unique,
  telegram_username text,
  total_posted integer default 0,
  total_rented integer default 0,
  total_sold integer default 0,
  total_expired integer default 0,
  avg_days_on_market float default null,
  close_rate float default null,
  coin_balance integer default 15,
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

create type coin_type as enum ('welcome', 'checkin', 'post_cost', 'reactivation');

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
        close_rate = round((current_closed::float / current_total::float) * 100, 1)
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
  insert into public.users (id, full_name, phone, email, coin_balance)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    15
  )
  on conflict (id) do nothing;

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

create policy "Anyone can flag listings" on flags for insert with check (true);
create policy "Flags readable by poster" on flags for select using (
  user_id = auth.uid() or exists (
    select 1 from listings where listings.id = flags.listing_id and listings.user_id = auth.uid()
  )
);

create policy "Users manage own favorites" on favorites for all using (auth.uid() = user_id);

create policy "Users read own coin transactions" on coin_transactions for select using (auth.uid() = user_id);
create policy "Users insert own coin transactions" on coin_transactions for insert with check (auth.uid() = user_id);
create policy "Users update own balance via coins" on coin_transactions for update using (auth.uid() = user_id);

create policy "Users manage own checkins" on checkin_log for all using (auth.uid() = user_id);

-- Storage bucket (run separately in dashboard or via API)
-- Create bucket: listings (public read)

-- Cron jobs (enable pg_cron first)
-- select cron.schedule('archive-expired-listings', '0 2 * * *', $$
--   update listings set status = 'archived', archived_reason = 'expired',
--     archived_at = now(), deletes_at = now() + interval '30 days'
--   where status = 'active' and expires_at < now();
-- $$);

-- select cron.schedule('delete-archived-listings', '0 3 * * *', $$
--   delete from listings where status = 'archived' and deletes_at < now();
-- $$);
