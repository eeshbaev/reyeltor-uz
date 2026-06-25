# Reyeltor.uz

Real estate rental and sales mobile app for Uzbekistan (Tashkent city and region). Built with Expo SDK 52, Supabase, and MapLibre GL.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

Fill in:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPTILER_KEY`

2. Run the SQL in `supabase/schema.sql` in your Supabase SQL editor.

3. Create a public Supabase Storage bucket named `listings`.

4. Install dependencies (already done if cloned):

```bash
npm install
```

5. Start the dev server:

```bash
npx expo start
```

**Note:** MapLibre requires a development build (not Expo Go). Use:

```bash
npx expo run:ios
# or
npx expo run:android
```

## Project structure

- `app/` — Expo Router screens (map-first tabs, auth, listing detail, agent profile)
- `components/` — Reusable UI (map bubbles, filters, listing cards, coins)
- `lib/` — Supabase client, coins logic, i18n, notifications, validation
- `translations/` — 10-language UI strings
- `types/` — TypeScript types
- `supabase/schema.sql` — Database schema, triggers, and RLS policies

## Features

- Map-first home screen with Maptiler tiles and Supercluster clustering
- Rent/Buy filters, list view, listing detail with agent card
- Registration with Uzbek phone validation and welcome coins
- Coin-based posting tiers, check-in rewards (Tue/Thu/Sat)
- Guest favorites via AsyncStorage, synced on login
- Local expiry and check-in notifications
