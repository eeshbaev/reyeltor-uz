# Google Play — Data safety answers (from PROJECT_SPEC.md §5)

Fill Play Console → App content → Data safety with these answers. Re-check after any new
outbound service (manual SP-09). Last checked: 2026-11-18.

**Does your app collect or share user data?** Yes.
**Is all user data encrypted in transit?** Yes (HTTPS to Supabase, Telegram, Expo, map services).
**Can users request deletion?** Yes — Profile → Delete all data (in-app), and by email.

| Data type (Play category) | Collected | Shared with third parties | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Name (Personal info) | Yes | No | Required for an account | Account management, App functionality |
| Phone number (Personal info) | Yes | No | Required for an account | Account management, App functionality, Fraud prevention |
| Email address (Personal info) | Yes | No | Optional | Account management |
| User IDs (Personal info) — Telegram user ID | Yes | No | Required for an account | Account management, Fraud prevention |
| Approximate/precise location — only the pin a seller places on a listing | Yes | No | Optional (only when posting) | App functionality |
| Photos (Photos and videos) — listing photos | Yes | No | Optional | App functionality |
| Other user-generated content — listing text | Yes | No | Optional | App functionality |
| App interactions — views, saves, contact taps | Yes | No | Required | Analytics (seller statistics), Fraud prevention |
| In-app search history — last map search, saved searches | Yes | No | Optional (can be switched off) | App functionality (alerts), Personalization |
| Crash logs / Diagnostics — error message, app version | Yes | No | Required | App functionality (fixing errors) |
| Device or other IDs — push token, app device ID | Yes | No | Required for notifications | App functionality |

Not collected: contacts, messages, calendar, health, financial info, precise device location
in the background, audio, files outside the app.

"Shared" means transferred to a third party for its own use. Service providers that process
data on our behalf (Supabase hosting, Expo/FCM push delivery, map tile providers) do not count
as sharing under Play's definition — they are listed in the privacy policy.

Before submitting: run the core loop through a network inspector (Proxyman/Charles or
Android Studio Network Inspector) and confirm every host appears in PROJECT_SPEC.md §5
(manual SP-08). Expected hosts: *.supabase.co, exp.host / fcm.googleapis.com, api.maptiler.com,
basemaps.cartocdn.com, nominatim.openstreetmap.org, overpass-api.de, images.pexels.com,
t.me, eeshbaev.github.io.
