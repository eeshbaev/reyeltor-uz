#!/usr/bin/env bash
# One-time Supabase setup for Reyeltor-uz. Run from the project folder:
#   bash scripts/setup-supabase.sh
#
# It does everything in order and stops at the first problem:
#   1. checks the database is ready (read-only)
#   2. applies supabase/apply-all-v1.sql (asks you first)
#   3. saves the server secrets
#   4. deploys the 3 server functions
#   5. connects the Telegram bot @Reyeltor_uz_bot
#   6. schedules the daily jobs
# Needs: `npx supabase login` done once, and TELEGRAM_BOT_TOKEN in .env. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."

SB="npx -y supabase@3.2.0"

set -a; source .env; set +a
: "${TELEGRAM_BOT_TOKEN:?Add TELEGRAM_BOT_TOKEN=... to .env}"
: "${EXPO_PUBLIC_SUPABASE_URL:?EXPO_PUBLIC_SUPABASE_URL missing in .env}"
BOT_USERNAME="${TELEGRAM_BOT_USERNAME:-Reyeltor_uz_bot}"
REF="$(echo "$EXPO_PUBLIC_SUPABASE_URL" | sed -E 's#https://([a-z0-9]+)\.supabase\.co.*#\1#')"
API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
BASE="https://${REF}.supabase.co/functions/v1"

if [ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
  TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"
  printf 'TELEGRAM_WEBHOOK_SECRET=%s\n' "$TELEGRAM_WEBHOOK_SECRET" >> .env
fi
if [ -z "${CRON_SECRET:-}" ]; then
  CRON_SECRET="$(openssl rand -hex 32)"
  printf 'CRON_SECRET=%s\n' "$CRON_SECRET" >> .env
fi

echo "== 1/6 Checking the database (read-only) =="
$SB db query --remote="$REF" --read-only --file supabase/check-before-v1.sql
echo
echo "Rows 1-3, 5 and 6 above should say 'ok'. Row 4 is fixed automatically by the update;"
echo "row 7 is turned on in step 6."
echo "Make sure you have a backup (Dashboard → Database → Backups)."
echo
echo ">>> Type the word yes (only yes) and press Enter. <<<"
read -r -p "Apply the database update now? " answer
answer="$(echo "$answer" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
if [ "$answer" != "yes" ] && [ "$answer" != "y" ]; then
  echo "Stopped. Nothing was changed."
  exit 0
fi

echo "== 2/6 Applying supabase/apply-all-v1.sql (all or nothing) =="
$SB db query --yes --remote="$REF" --file supabase/apply-all-v1.sql >/dev/null
echo "Database updated."

echo "== 3/6 Saving secrets =="
curl -fsS "$API/getMe" | grep -q '"ok":true' || { echo "Bot token rejected by Telegram. Check TELEGRAM_BOT_TOKEN in .env."; exit 1; }
$SB secrets set --yes --remote="$REF" \
  CRON_SECRET="$CRON_SECRET" \
  TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
  TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET" \
  TELEGRAM_BOT_USERNAME="$BOT_USERNAME"

echo "== 4/6 Deploying server functions =="
$SB functions deploy telegram-auth notification-jobs saved-search-alerts \
  --yes --no-verify-jwt --use-api --remote="$REF"

echo "== 5/6 Connecting the Telegram bot =="
curl -fsS "$API/setWebhook" -H 'Content-Type: application/json' \
  -d "{\"url\":\"${BASE}/telegram-auth/webhook\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\",\"allowed_updates\":[\"message\"],\"drop_pending_updates\":true}" >/dev/null
curl -fsS "$API/setMyDescription" -H 'Content-Type: application/json' \
  -d '{"description":"Reyeltor-uz — Toshkentdagi ko‘chmas mulk. Bu bot ro‘yxatdan o‘tishda telefon raqamingizni tasdiqlaydi."}' >/dev/null
curl -fsS "$API/setMyDescription" -H 'Content-Type: application/json' \
  -d '{"language_code":"ru","description":"Reyeltor-uz — недвижимость Ташкента. Этот бот подтверждает ваш номер телефона при регистрации."}' >/dev/null
curl -fsS "$API/setMyShortDescription" -H 'Content-Type: application/json' \
  -d '{"short_description":"Reyeltor-uz: telefon raqamini tasdiqlash"}' >/dev/null

echo "== 6/6 Scheduling daily jobs =="
SCHEDULES="$(mktemp)"
trap 'rm -f "$SCHEDULES"' EXIT
cat > "$SCHEDULES" <<SQL
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job
where jobname in ('reyeltor-daily-jobs', 'saved-search-instant', 'saved-search-digest');

-- 09:00 Tashkent (04:00 UTC): expiry reminders, archiving, deleting old archived listings.
select cron.schedule('reyeltor-daily-jobs', '0 4 * * *', \$\$
  select net.http_post(
    url := '${BASE}/notification-jobs',
    headers := jsonb_build_object('x-cron-secret', '${CRON_SECRET}', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
\$\$);

-- Every 5 minutes: saved-search alerts.
select cron.schedule('saved-search-instant', '*/5 * * * *', \$\$
  select net.http_post(
    url := '${BASE}/saved-search-alerts?mode=instant',
    headers := jsonb_build_object('x-cron-secret', '${CRON_SECRET}', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
\$\$);

-- 20:00 Tashkent (15:00 UTC): saved-search digest.
select cron.schedule('saved-search-digest', '0 15 * * *', \$\$
  select net.http_post(
    url := '${BASE}/saved-search-alerts?mode=digest',
    headers := jsonb_build_object('x-cron-secret', '${CRON_SECRET}', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
\$\$);

select jobname, schedule, active from cron.job order by jobname;
SQL
$SB db query --yes --remote="$REF" --file "$SCHEDULES"

echo
echo "Done. Telegram registration is live for @${BOT_USERNAME}."
echo "Last step (after the new app build is on phones): Dashboard → Authentication →"
echo "Sign In / Providers → turn off 'Allow new users to sign up'."
