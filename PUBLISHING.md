# Publishing Reyeltor.uz

## Privacy policy (GitHub Pages)

Static policy pages live in [`docs/`](docs/):

| File | URL (after Pages is enabled) |
|------|------------------------------|
| English | https://eeshbaev.github.io/reyeltor-uz/privacy.html |
| Uzbek | https://eeshbaev.github.io/reyeltor-uz/privacy-uz.html |

The app uses the English URL as `PRIVACY_POLICY_URL` in [`lib/constants.ts`](lib/constants.ts) — paste the same URL into **Google Play Console → App content → Privacy policy**.

### One-time GitHub setup

1. Create a public repo named **reyeltor-uz** under **eeshbaev** (or push this project and update `PRIVACY_POLICY_URL` if the repo name differs).
2. Push `main` to GitHub.
3. **Settings → Pages → Build and deployment → Source:** Deploy from branch **main**, folder **/docs**.
4. Wait ~1 minute, then open the privacy URL above.

---

## Google Play Store

### Prerequisites

- [Google Play Console](https://play.google.com/console) developer account ($25 one-time).
- Expo account **eeshbaev95** (already linked in `app.json`).
- EAS environment variables for production (run once per project):

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --type string
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --type string
eas secret:create --name EXPO_PUBLIC_MAPTILER_KEY --value "YOUR_MAPTILER_KEY" --type string
```

### 1. Production Android build (AAB)

**Cloud build** (recommended if EAS free quota available):

```bash
npx eas-cli build --platform android --profile production
```

**Local AAB** (on your Mac — uses `.env` for `EXPO_PUBLIC_*` vars):

```bash
cd /Users/Erkin/Documents/Reyeltor.uz

# 1. Prerequisites (one-time): Android Studio, SDK, NDK 27.1.12297006, Java 17
#    Open Android Studio → SDK Manager → SDK Tools → NDK (Side by side) → 27.1.12297006

# 2. Ensure .env has real values (not placeholders)
#    EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_MAPTILER_KEY

# 3. Install deps
npm install

# 4. Log in to Expo (if not already)
npx eas-cli login

# 5. Build signed .aab locally (first run may prompt for Android keystore — let EAS create one)
npx eas-cli build --platform android --profile production --local

# Output: path printed in terminal, usually *.aab in project directory
```

Alternative **Gradle-only** path (manual signing):

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
# Unsigned: android/app/build/outputs/bundle/release/app-release.aab
# Configure signing in android/gradle.properties + upload keystore first
```

Download cloud `.aab` from the [Expo dashboard](https://expo.dev/accounts/eeshbaev95/projects/reyeltor-uz/builds) when using cloud build.

### 2. Play Console — create app

1. **Create app** → name **Reyeltor.uz**, default language, app/game, free.
2. **App content**
   - Privacy policy URL: `https://eeshbaev.github.io/reyeltor-uz/privacy.html`
   - Complete Data safety, Ads (if none), Content rating, Target audience, News app (No), COVID (No), etc.
3. **Store listing**
   - Short & full description (Uzbek and/or English).
   - App icon: `assets/google-play-icon-512.png` (512×512).
   - Feature graphic: 1024×500 (create in Canva/Figma if needed).
   - Phone screenshots (min 2): capture from emulator or device.
4. **Release → Internal testing** (recommended first) or Production
   - Upload the `.aab` from EAS local/cloud build.
   - Release name e.g. `1.0.0 (1)`.

### 3. Optional: EAS Submit

After creating the app in Play Console and setting up a [Google Play service account](https://docs.expo.dev/submit/android/):

```bash
npx eas-cli submit --platform android --profile production --latest
```

Or upload the `.aab` manually in Play Console.

### Package & signing

| Field | Value |
|-------|--------|
| Android package | `uz.reyeltor.app` |
| EAS project ID | `24bcc57e-18b0-44d6-b79f-c9caddd0ce4a` |
| Build type (production) | App Bundle (`.aab`) |

EAS manages the upload keystore for you on first production build.

---

## Checklist before review

- [ ] Privacy policy URL loads in a browser
- [ ] Supabase production project configured; `handle_new_user` trigger applied (`supabase/schema.sql`)
- [ ] Storage bucket `reyeltor-listings` exists and policies allow authenticated uploads
- [ ] EAS secrets set for all `EXPO_PUBLIC_*` variables
- [ ] Test registration and posting a listing on a release build
- [ ] Play Console Data safety form matches what the app collects (phone, email, photos, location for listings)
