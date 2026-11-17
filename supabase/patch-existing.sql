-- Run this in Supabase SQL Editor when tables already exist.
-- Safe to re-run (idempotent). Do NOT re-run schema.sql from the top.

-- ---------------------------------------------------------------------------
-- 1. Auth trigger: auto-create profile on sign-up (required for registration)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Listing triggers (replace if you already have older versions)
-- ---------------------------------------------------------------------------
create or replace function increment_total_posted()
returns trigger as $$
begin
  update users set total_posted = total_posted + 1 where id = new.user_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_listing_created on listings;
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

drop trigger if exists on_listing_archived on listings;
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

drop trigger if exists on_price_changed on listings;
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

drop trigger if exists on_listing_edited on listings;
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

drop trigger if exists on_flag_inserted on flags;
create trigger on_flag_inserted
after insert on flags
for each row execute function check_flag_count();

-- ---------------------------------------------------------------------------
-- 3. RLS policies (skip if policy already exists — ignore duplicate errors)
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table listings enable row level security;
alter table listing_photos enable row level security;
alter table price_history enable row level security;
alter table flags enable row level security;
alter table favorites enable row level security;
alter table coin_transactions enable row level security;
alter table checkin_log enable row level security;

drop policy if exists "Users are publicly readable" on users;
create policy "Users are publicly readable" on users for select using (true);
drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users for update using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on users;
create policy "Users can insert own profile" on users for insert with check (auth.uid() = id);

drop policy if exists "Listings are publicly readable" on listings;
create policy "Listings are publicly readable" on listings for select using (true);
drop policy if exists "Users can insert own listings" on listings;
create policy "Users can insert own listings" on listings for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own listings" on listings;
create policy "Users can update own listings" on listings for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own listings" on listings;
create policy "Users can delete own listings" on listings for delete using (auth.uid() = user_id);

drop policy if exists "Photos are publicly readable" on listing_photos;
create policy "Photos are publicly readable" on listing_photos for select using (true);
drop policy if exists "Owners can manage photos" on listing_photos;
create policy "Owners can manage photos" on listing_photos for all using (
  exists (select 1 from listings where listings.id = listing_photos.listing_id and listings.user_id = auth.uid())
);

drop policy if exists "Price history is publicly readable" on price_history;
create policy "Price history is publicly readable" on price_history for select using (true);

drop policy if exists "Anyone can flag listings" on flags;
create policy "Anyone can flag listings" on flags for insert with check (true);
drop policy if exists "Flags readable by poster" on flags;
create policy "Flags readable by poster" on flags for select using (
  user_id = auth.uid() or exists (
    select 1 from listings where listings.id = flags.listing_id and listings.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own favorites" on favorites;
create policy "Users manage own favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users read own coin transactions" on coin_transactions;
create policy "Users read own coin transactions" on coin_transactions for select using (auth.uid() = user_id);
drop policy if exists "Users insert own coin transactions" on coin_transactions;
create policy "Users insert own coin transactions" on coin_transactions for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own balance via coins" on coin_transactions;
create policy "Users update own balance via coins" on coin_transactions for update using (auth.uid() = user_id);

drop policy if exists "Users manage own checkins" on checkin_log;
create policy "Users manage own checkins" on checkin_log for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Storage bucket (create in Dashboard if missing)
--    Name: reyeltor-listings | Public: yes | Authenticated users can upload
-- ---------------------------------------------------------------------------

-- 5. Profile avatars (column + storage policies)
alter table public.users
  add column if not exists avatar_url text;

alter table public.users
  add column if not exists bio text;

alter table public.users
  add column if not exists phone_visible boolean not null default true;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
);

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'reyeltor-listings'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);
