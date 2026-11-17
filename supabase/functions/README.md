# Supabase Edge Functions — Notifications

## Deploy

```bash
supabase functions deploy notification-jobs --no-verify-jwt
```

Set secrets in the Supabase dashboard:

- `CRON_SECRET` — random string used by the scheduled job HTTP call

The function uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically in hosted Supabase.

## Schedule (daily)

In **Supabase Dashboard → Edge Functions → Schedules**, or via SQL with `pg_cron` + `pg_net`:

```
POST https://<project-ref>.supabase.co/functions/v1/notification-jobs
Header: x-cron-secret: <CRON_SECRET>
```

Recommended: once per day at **09:00 Asia/Tashkent**.

## What it sends

| Job | Audience | Dedup key |
|-----|----------|-----------|
| Listing expiry 15d | Listing owner | `expiry15-{listingId}` |
| Listing expiry 5d | Listing owner | `expiry5-{listingId}` |
| Archive delete 10d | Listing owner | `delete10-{listingId}` |
| Availability check-in (every 14 days unconfirmed) | Listing owner | `confirm-{listingId}-{confirmedAt}-{period}` |
| Archive expired listings (no push) | — | runs `archive_expired_listings()` first |
| Price change | Users who favorited the listing | `price-{listingId}-{newPrice}-{userId}` |

Respects `notification_preferences` toggles and writes to `notification_log`.

## Saved-search alerts (`saved-search-alerts`)

Requires `supabase/patch-saved-searches-v1.sql` to be applied first.

```bash
supabase functions deploy saved-search-alerts --no-verify-jwt
```

Two schedules (pg_cron + pg_net, times are UTC; Tashkent = UTC+5):

```sql
select cron.schedule('saved-search-instant', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/saved-search-alerts?mode=instant',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);

select cron.schedule('saved-search-digest', '0 15 * * *', $$  -- 20:00 Tashkent
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/saved-search-alerts?mode=digest',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
```

| Step | Rule |
|------|------|
| Matching | New active listings only, once each, after photos are attached (or 30 min). Never the poster's own searches. Drawn-area searches are not matched in V1. |
| Instant push | One push per saved search per run (several matches are bundled). Max **5 instant pushes per user per Tashkent day**. |
| Digest | Matches over the daily cap are delivered in **one summary push per user** at 20:00 Tashkent. |
| Muted search / sold listing | Pending matches are skipped at delivery time. |
| USD searches | Converted with the CBU rate in `fx_rates`, refreshed by this function twice a day. |

Both cron jobs must be scheduled: if only the instant job runs, matches over the cap stay queued (they are never dropped silently, but they are not sent either).

## Client setup

1. Run `supabase/patch-notifications.sql` in the SQL editor.
2. Rebuild the native app (push credentials via EAS).
3. Users opt in via post flow or first favorite; manage toggles in Profile.
