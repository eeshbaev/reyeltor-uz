#!/usr/bin/env bash
# Copies the app's public settings (EXPO_PUBLIC_* in .env) to EAS, so builds made on
# Expo's servers (Play Store / App Store builds) can reach Supabase. Run from the project folder:
#   npx eas-cli login          (once)
#   bash scripts/setup-eas-env.sh
# Only EXPO_PUBLIC_* values are copied: they are built into the app anyway. Server secrets
# (TELEGRAM_BOT_TOKEN, CRON_SECRET...) stay in .env / Supabase and are never sent to EAS.
set -euo pipefail
cd "$(dirname "$0")/.."

EAS="npx -y eas-cli@latest"
ENVIRONMENTS=(production preview development)

$EAS whoami </dev/null >/dev/null 2>&1 || { echo "Not logged in to Expo. Run: npx eas-cli login"; exit 1; }

found=0
while IFS='=' read -r name value; do
  [[ "$name" =~ ^EXPO_PUBLIC_[A-Z0-9_]+$ ]] || continue
  value="${value%\"}"; value="${value#\"}"
  [ -n "$value" ] || continue
  found=$((found + 1))
  for env in "${ENVIRONMENTS[@]}"; do
    echo "→ $name ($env)"
    # </dev/null: otherwise npx reads the rest of .env from stdin and the loop stops after one value.
    $EAS env:create --scope project --environment "$env" --name "$name" --value "$value" \
      --visibility plaintext --type string --force --non-interactive >/dev/null </dev/null
  done
done < <(grep -E '^EXPO_PUBLIC_[A-Z0-9_]+=' .env)

if [ "$found" -eq 0 ]; then echo "No EXPO_PUBLIC_* values found in .env"; exit 1; fi

echo
echo "Saved $found setting(s). Production now has:"
$EAS env:list --environment production </dev/null
for required in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY; do
  grep -q "^$required=" .env || echo "⚠️  $required is missing from .env — the store build will not reach Supabase."
done
