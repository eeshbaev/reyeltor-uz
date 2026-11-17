
-- ---------------------------------------------------------------------------
-- Growth features: referrals, engagement stats, share economy (idempotent)
-- ---------------------------------------------------------------------------

alter table users add column if not exists referred_by uuid references users(id) on delete set null;

alter type coin_type add value if not exists 'referral_register';
alter type coin_type add value if not exists 'referral_bonus';
alter type coin_type add value if not exists 'referral_first_post';
alter type coin_type add value if not exists 'referral_first_favorite';

create table if not exists referral_codes (
  user_id uuid primary key references users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz default now()
);

create table if not exists referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references users(id) on delete cascade,
  referred_id uuid not null references users(id) on delete cascade,
  event_type text not null check (event_type in ('register', 'first_post', 'first_favorite')),
  created_at timestamptz default now(),
  unique(referred_id, event_type)
);

create table if not exists listing_engagement_stats (
  listing_id uuid primary key references listings(id) on delete cascade,
  save_count integer not null default 0,
  price_drop_percent smallint,
  updated_at timestamptz default now()
);

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

drop trigger if exists on_price_history_engagement on price_history;
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

drop trigger if exists on_favorite_engagement on favorites;
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

alter table referral_codes enable row level security;
alter table referral_events enable row level security;
alter table listing_engagement_stats enable row level security;

drop policy if exists "Referral codes readable by owner" on referral_codes;
create policy "Referral codes readable by owner" on referral_codes
  for select using (auth.uid() = user_id);

drop policy if exists "Referral codes insert own" on referral_codes;
create policy "Referral codes insert own" on referral_codes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Referral events readable by parties" on referral_events;
create policy "Referral events readable by parties" on referral_events
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "Engagement stats publicly readable" on listing_engagement_stats;
create policy "Engagement stats publicly readable" on listing_engagement_stats
  for select using (true);

-- Backfill engagement stats from existing favorites
insert into listing_engagement_stats (listing_id, save_count)
select listing_id, count(*)::integer
from favorites
group by listing_id
on conflict (listing_id) do update set
  save_count = excluded.save_count,
  updated_at = now();

-- Backfill latest price drop per listing
insert into listing_engagement_stats (listing_id, save_count, price_drop_percent)
select distinct on (ph.listing_id)
  ph.listing_id,
  coalesce(les.save_count, 0),
  round(((ph.old_price - ph.new_price)::float / ph.old_price::float) * 100)::smallint
from price_history ph
left join listing_engagement_stats les on les.listing_id = ph.listing_id
where ph.new_price < ph.old_price
order by ph.listing_id, ph.changed_at desc
on conflict (listing_id) do update set
  price_drop_percent = excluded.price_drop_percent,
  updated_at = now();
