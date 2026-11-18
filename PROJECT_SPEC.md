# Reyeltor-uz — Project spec

Living spec required by the App Design Instruction Manual (F-01, F-05, SP-01, SP-06, PR-13, PF-03).
Last full audit: 2026-11-18 (commit 6d54e23). Re-run the Part 14 ship gate before every release.

## 1. Product foundation

**Job sentence (F-01).** When I need a home, office or shop in Tashkent, I want to see real listings and prices on one map and be told when something new or cheaper appears, so I can decide quickly without chasing classifieds.

Sellers: When I have a property to rent or sell, I want to publish it on the map in minutes for free, so the right people contact me.

**Core loop (F-02).** Open → map filtered to my goal → tap a price → contact the seller or save/follow → alert brings me back.

**Time to value (F-03).** Target: a listing opened within 60 s of first launch (2 onboarding screens). Measure "first-session success" = opened a listing in the first session.

**Natural return trigger (H-01).** A new match for a followed search, a price drop on a saved home (≥ 3%), or (sellers) views/contacts and the 90-day freshness reminder. Need-driven cadence: weeks of intense use, then a pause (H-07). No streaks.

**Not doing (F-05)** — revisit quarterly:
- Streaks, points, leaderboards (RP-01; wrong cadence).
- Paid features or paywalls until the owner decides (see the strategy doc).
- Chat inside the app (Telegram and phone already work for Tashkent).
- Re-engagement pushes without a fact ("We miss you").
- Mortgage applications / payments in the app.
- Public user ratings of sellers (abuse risk) — only factual stats.

## 2. Visual identity (PR-13)

- Personality: **calm, precise, warm.** Art direction: golden-hour map; the price is always the hero.
- Tokens: `lib/design/` — colours (`colors.ts`, `fixedColors` for brand surfaces), type (`typography.ts`, Inter), radius (8/12/20/pill), spacing (4-pt), motion springs (`motion.ts`), window classes (`windowClass.ts`).
- Accent: blue = act; gold = yours (Early Member, coins, your listing). Status colours only for status.
- Signature interaction: the selected price bubble lifts; first listing gets one gold ring.
- Lint enforces: no raw hex, radius or font size in screens (`.eslintrc.json` overrides).

## 3. One pattern per situation (PF-03)

| Situation | Pattern | Where |
| --- | --- | --- |
| Action confirmed / undoable | `showToast({ message, actionLabel: Undo })` | `components/ui/Toast.tsx` |
| Action failed | `showActionError(t, action, error)` — what didn't happen + what is safe + what to do (offline vs server) | `lib/error/actionError.ts` |
| Loading 1–3 s, familiar layout | Skeleton of the real layout | `components/ui/Skeleton.tsx` |
| Loading, unfamiliar layout | Small spinner in place | — |
| Empty list | `EmptyState`: what belongs here + one action | `components/ui/EmptyState.tsx` |
| Permission | One-line reason alert, then system dialog; denied → Settings link | `lib/notifications/local.ts`, `useCurrentLocation` |
| Rating | Only after value moments, native review, 7 days, 90-day cooldown, max 3 | `lib/growth/ratingPrompt.ts` |
| Draft | Auto-saved after 1.2 s, restored with "Start over" | `lib/post/postDraft.ts` |

## 4. Threat model (SP-01)

| Question | Answer |
| --- | --- |
| Sensitive data | Phone number (Telegram-verified), name, optional email, password (hashed by Supabase), listing addresses/pins, favorites and saved searches (reveal intent), push tokens |
| Sensitivity level | **Medium** (no health/finance data; phone + location of a property) |
| Where it lives | Supabase Postgres with RLS; Supabase Storage for photos; AsyncStorage on the phone (drafts, settings, guest favorites) |
| Who could see it | Other users (only what the seller makes public: listing, optional phone); someone holding the unlocked phone; the backend operator; push providers (Expo/FCM) see notification text |
| Controls | RLS + security-definer functions; public profile view hides private fields; phone visibility toggle; server-only bot token; rate limits on login/registration; release builds strip console output; app_errors has no user content |
| Accepted & told | Push text contains district and price (not personal data). Someone with the unlocked phone sees the account (no app lock — Medium level) |

## 5. Privacy decision records (SP-06)

| Service | Data sent | Why | Opt-in/out | Disclosed |
| --- | --- | --- | --- | --- |
| Supabase (database, auth, storage, functions) | Account, listings, photos, favorites, saved searches | The product's backend | Required for accounts; browsing works without one | Privacy policy |
| Telegram Bot API (server-side) | Phone + name the user shares with @Reyeltor_uz_bot | Verified registration | User-initiated | Privacy policy |
| Expo push → FCM | Push token, notification text (district, price) | Alerts the user asked for | Per-type toggles in Profile | Privacy policy |
| MapTiler / CARTO tiles, geocoding | Map tile coordinates, typed address text, IP | Map and address search | Required for the map | Privacy policy — **check wording mentions geocoding** |
| Nominatim / Overpass (OSM) | Address text / tapped point, IP | Fallback geocoding, building outline | Only when used | Privacy policy — **check** |
| Pexels CDN | Image requests (IP) | Demo listing photos | Demo listings only | — (add one line) |
| CBU.uz (server-side) | Nothing personal | USD rate | — | — |
| app_errors (own Supabase) | Error message, stack, app version, platform, user id | Fix crashes | On; no user content | Privacy policy |
| Sentry (only if a DSN is configured) | Crash data | Optional | Off unless DSN set | Privacy policy |

An AI tool must not add a new outbound service without adding a row here first.

## 6. Manual audit — MUST rules (2026-11-18)

Status: ✅ pass · 🔧 fixed today · ⏳ open · 📱 needs a device test · N/A not applicable (reason).

| Rule | Status | Note |
| --- | --- | --- |
| F-01/F-02/F-05 job, loop, not-doing | 🔧 | This file |
| F-03 time to value | 📱 | Onboarding is 2 screens; stopwatch on device |
| F-07 critical states | ⏳ | Returning user with 6 months of data not yet reviewed |
| V-01 word budgets | ✅ | Toasts/errors kept short; onboarding within budget |
| V-03 icon + label in navigation | ✅ | Tab bar has labels |
| H-02 value before asking | ✅ | Account/notifications/rating only after value moments |
| H-06 never punish absence | ✅ | No streaks, no guilt copy |
| L-01 margins / L-02 proximity | ✅ | 16 on phones, tokens |
| L-03 radius scale | 🔧 | 4 radii, lint-enforced |
| L-04 safe areas | ✅ | safe-area insets on screen roots |
| L-05 / AD-06 keyboard | 📱 | Check post form and login on a small phone |
| L-06 / AD-01/02 window classes | 🔧 | `useWindowClass`; 640 column; 2-col favorites; side panel and navigation rail on expanded windows |
| L-07 line length | 🔧 | 640 max column on wide windows |
| L-08 / AD-03 live resize keeps state | 📱 | Test split screen on the emulator |
| T-01 minimum sizes | ✅ | body 15, micro 11 |
| T-02 font scaling | 🔧 | Removed the 1.3 cap; test at 200% 📱 |
| T-05 font covers scripts | ✅ | Inter: Latin incl. U+02BB, Cyrillic; Chinese falls back |
| C-01 semantic tokens | 🔧 | No raw hex in screens (lint) |
| C-02 contrast | 🔧 | tertiary, success, warning, coin fixed; re-check dark mode 📱 |
| C-03 colour never the only signal | ✅ | Icons + text on status |
| C-05 dark mode designed | ✅ | Near-black #0A0A0A, lighter elevated surfaces |
| N-01 target size | ⏳ | hitSlop on small icons; run Layout Inspector 📱 |
| N-03 gesture alternatives | ✅ | Menus for listing actions |
| N-05 bottom navigation 3–5 | ✅ | 5 tabs |
| N-07 predictive back | 🔧 📱 | Enabled (manifest + app.json). React Native routes back through OnBackPressedDispatcher, so in-app back keeps working — confirm on the device |
| N-08 tabs keep their stack | ✅ | expo-router tabs |
| N-11 deep links | ✅ | Listings, notifications |
| K-01 verb + object labels | ✅ | Mostly; "Start" on onboarding is acceptable |
| K-02 five button states | ✅ | `Button` has loading/disabled |
| K-08 field count | ✅ | Registration: phone + name from Telegram, password, optional email |
| K-10 validation timing | 📱 | Check post form |
| S-01 optimistic UI | ✅ | Favorites, toggles |
| S-02 empty states | ✅ | Favorites, My listings, map no-results |
| S-03 error formula | 🔧 | All generic errors replaced |
| S-04 undo instead of confirm | 🔧 | Save/unsave home has Undo; archive has 30-day reactivation |
| S-05 offline | ✅ | Cached map, "Showing saved results" notice; specific offline errors |
| S-06 drafts | 🔧 | Post form autosave/restore |
| S-07 no silent disabled buttons | ✅ | Publish hints explain what's missing |
| S-09 permission denied | ✅ | Location → Settings link |
| M-05 / AN-07 reduce motion | ✅ | All new motion has a fade fallback |
| M-06 transform/opacity only | ✅ | Reanimated on UI thread |
| AN-09 motion never the only signal | ✅ | Toasts/text accompany animations |
| O-01 no account wall | ✅ | Browse without account |
| O-02 ≤ 3 onboarding screens | 🔧 | 2 screens |
| O-05 just-in-time permissions | ✅ | Pre-prompt then system dialog |
| O-08 privacy screen | ✅ | Profile → Privacy |
| O-10 export + delete-all | 🔧 | Export my data added; delete-all existed |
| LG-01 no artificial splash delay | 🔧 | Minimum cut from 1.5 s to 0.4 s (anti-flash); the splash ends when startup work is done |
| LG-02 no logo on warm start | ✅ | Splash only on cold start |
| SP-02 platform security | 🔧 | Session token in expo-secure-store (Keystore), chunked; old AsyncStorage session migrated on first read |
| SP-05 leak paths | 🔧 | Console stripped in release; ⏳ push text on lock screen shows district+price (Medium: acceptable) |
| SP-06 decision records | 🔧 | Section 5 |
| SP-08 network proof | 📱 | Host list and steps in `docs/PLAY_DATA_SAFETY.md` |
| SP-09 store disclosures | 🔧 | Answers in `docs/PLAY_DATA_SAFETY.md`; privacy policy now names map/address services and Pexels |
| R-04 notification 3 questions | ✅ | Only own searches/favorites |
| R-05 frequency cap | ✅ | Daily cap + digest |
| R-07 copy formula | ✅ | Specific district/price |
| R-08 deep link to item | ✅ | |
| ND-02 quiet hours | 🔧 | Instant alerts and price drops pause 22:00–08:00 Tashkent (redeploy function) |
| ND-07 notification settings | ✅ | Per-type toggles |
| FB-01/02/05 feedback & rating | 🔧 | Value moments, 7 days, 90-day cooldown, native API, no gating |
| A-01 labels on icon buttons | ⏳ | Spot-check with TalkBack 📱 |
| A-08 plurals | 🔧 | i18next v4 plurals; new Russian strings use one/few/many |
| A-09 +40% text | 📱 | Check Russian/Uzbek on small phone |
| A-10 locale formats | ✅ | Intl date/number formatting |
| A-11 Uzbek ʻ (U+02BB) | 🔧 | oʻ/gʻ use U+02BB, tutuq belgisi U+02BC, in uz.json and server push/bot texts; have a native speaker skim |
| A-12 RTL | N/A | No RTL language shipped |
| A-13 in-app language | ✅ | Language switcher |
| PR-14 no layout shift | ✅ | Tabular numbers on prices/counts |
| PR-15 truthful success | ✅ | Success only after the server confirms |

**Open MUST items:** only device checks remain (📱): Part 14 tests 4, 6, 7, 8, 9, 16, 17, 21, 22, 24, 26 and the network proof (SP-08).
