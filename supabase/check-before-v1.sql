-- Reyeltor-uz: READ-ONLY check before running apply-all-v1.sql.
-- Paste into Supabase → SQL Editor → Run. It changes nothing.
-- Every row should say "ok". Send a screenshot of any row that does not.
select item, status, fix from (
  select 1 as n, 'Base schema (users, listings, photos, favorites, coins)' as item,
    case when to_regclass('public.users') is not null and to_regclass('public.listings') is not null
          and to_regclass('public.listing_photos') is not null and to_regclass('public.favorites') is not null
          and to_regclass('public.coin_transactions') is not null and to_regclass('public.checkin_log') is not null
          and to_regclass('public.flags') is not null and to_regclass('public.price_history') is not null
         then 'ok' else 'MISSING' end as status,
    'Run supabase/schema.sql first (only for a brand-new project)' as fix
  union all
  select 2, 'Notifications tables',
    case when to_regclass('public.push_tokens') is not null and to_regclass('public.notification_preferences') is not null
          and to_regclass('public.notification_log') is not null and to_regclass('public.notification_dedup') is not null
         then 'ok' else 'MISSING' end,
    'Run supabase/patch-notifications.sql'
  union all
  select 3, 'Referral / engagement tables',
    case when to_regclass('public.referral_codes') is not null and to_regclass('public.referral_events') is not null
          and to_regclass('public.listing_engagement_stats') is not null
          and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'referred_by')
         then 'ok' else 'MISSING' end,
    'Run supabase/patch-growth.sql'
  union all
  select 4, 'Profile columns (avatar, bio, phone visibility)',
    case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'users'
               and column_name in ('avatar_url', 'bio', 'phone_visible', 'telegram_username')) = 4
         then 'ok' else 'MISSING (auto-fixed)' end,
    'Not blocking: apply-all-v1.sql adds the missing columns (patch-prereq-v1.sql)'
  union all
  select 5, 'Photo storage bucket "reyeltor-listings"',
    case when exists (select 1 from storage.buckets where id = 'reyeltor-listings') then 'ok' else 'MISSING' end,
    'Run supabase/storage-setup.sql'
  union all
  select 6, 'Extension pgcrypto (password check)',
    case when exists (select 1 from pg_extension where extname = 'pgcrypto') then 'ok' else 'MISSING' end,
    'Database → Extensions → enable "pgcrypto"'
  union all
  select 7, 'Extensions pg_cron + pg_net (daily jobs)',
    case when (select count(*) from pg_extension where extname in ('pg_cron', 'pg_net')) = 2 then 'ok' else 'MISSING' end,
    'Database → Extensions → enable "pg_cron" and "pg_net" (needed only for the schedules)'
  union all
  select 8, 'No duplicate reports (needed for one-report-per-account rule)',
    case when not exists (select 1 from public.flags where user_id is not null group by listing_id, user_id having count(*) > 1)
         then 'ok' else 'DUPLICATES' end,
    'Not blocking: the patch skips that rule and tells you; send me a screenshot'
  union all
  select 9, 'V1 patches already applied?',
    case when to_regclass('public.saved_searches') is not null then 'already applied (re-running is safe)' else 'not yet — ok' end,
    ''
) checks
order by n;
