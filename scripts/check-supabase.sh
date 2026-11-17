#!/usr/bin/env bash
# Quick health check of the live Supabase setup. Changes nothing. Run from the project folder:
#   bash scripts/check-supabase.sh
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

URL="$EXPO_PUBLIC_SUPABASE_URL"
KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
REF="$(echo "$URL" | sed -E 's#https://([a-z0-9]+)\.supabase\.co.*#\1#')"
pass=0; fail=0
ok()  { echo "  ✅ $1"; pass=$((pass+1)); }
bad() { echo "  ❌ $1"; echo "     → $2"; fail=$((fail+1)); }

echo "1. Database reachable + update applied"
code=$(curl -s -m 40 -o /tmp/rey_check.json -w '%{http_code}' "$URL/rest/v1/public_profiles?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
if [ "$code" = "200" ]; then ok "database answers and the update is applied"
elif [ "$code" = "000" ]; then bad "no answer from $URL within 40 s" "check internet (a phone hotspot can be very slow) and that the project is not paused (Dashboard → project → Restore)"
else bad "database update not applied (HTTP $code: $(head -c 160 /tmp/rey_check.json))" "run: bash scripts/setup-supabase.sh and type yes"; fi

echo "2. Listings load fast enough for the app"
start=$(node -e 'console.log(Date.now())')
code=$(curl -s -m 40 -o /dev/null -w '%{http_code}' "$URL/rest/v1/listings?select=id&status=eq.active&limit=50" -H "apikey: $KEY" -H "Authorization: Bearer $KEY")
end=$(node -e 'console.log(Date.now())')
ms=$(( end - start ))
if [ "$code" = "200" ] && [ "$ms" -lt 20000 ]; then ok "listings answered in ${ms} ms$([ "$ms" -gt 3000 ] && echo ' (slow connection, but within the app limit of 20 s)')"
else bad "listings HTTP $code in ${ms} ms (app gives up after 20000 ms)" "send this line to Claude"; fi

echo "3. Telegram server function deployed and configured"
resp=$(curl -s -m 40 -X POST "$URL/functions/v1/telegram-auth" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' -d '{"action":"start","purpose":"register","locale":"uz"}')
if echo "$resp" | grep -q '"botUrl"'; then ok "telegram-auth works ($(echo "$resp" | grep -o 'https://t.me/[^"?]*'))"
elif echo "$resp" | grep -qi 'not found\|NOT_FOUND'; then bad "telegram-auth is not deployed" "run: bash scripts/setup-supabase.sh"
elif echo "$resp" | grep -q 'not_configured'; then bad "telegram-auth has no bot token" "run: bash scripts/setup-supabase.sh"
else bad "telegram-auth error: $(echo "$resp" | head -c 200)" "send this line to Claude"; fi

echo "4. Telegram bot connected to the server"
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  info=$(curl -s -m 15 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
  if echo "$info" | grep -q "functions/v1/telegram-auth/webhook"; then
    if echo "$info" | grep -q '"last_error_message"'; then bad "bot connected but Telegram reports an error: $(echo "$info" | grep -o '"last_error_message":"[^"]*"')" "send this line to Claude"
    else ok "@${TELEGRAM_BOT_USERNAME:-bot} is connected"; fi
  else bad "bot is not connected to the server" "run: bash scripts/setup-supabase.sh"; fi
else bad "TELEGRAM_BOT_TOKEN missing in .env" "add it to .env"; fi

echo "5. Daily jobs scheduled"
jobs=$(npx -y supabase@3.2.0 db query --remote="$REF" --read-only "select count(*) as n from cron.job where jobname in ('reyeltor-daily-jobs','saved-search-instant','saved-search-digest')" 2>/dev/null | grep -Eo '\b[0-3]\b' | tail -1)
if [ "${jobs:-0}" = "3" ]; then ok "3 scheduled jobs found"
else bad "scheduled jobs missing (${jobs:-0}/3)" "run: bash scripts/setup-supabase.sh"; fi

echo
echo "Result: $pass ok, $fail problem(s)."
