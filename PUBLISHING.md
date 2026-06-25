# Publishing Reyeltor.uz

## Privacy policy (GitHub Pages)

Static policy pages live in [`docs/`](docs/):

| File | URL (after Pages is enabled) |
|------|------------------------------|
| English | https://eeshbaev95.github.io/reyeltor-uz/privacy.html |
| Uzbek | https://eeshbaev95.github.io/reyeltor-uz/privacy-uz.html |

The app uses the English URL as `PRIVACY_POLICY_URL` in [`lib/constants.ts`](lib/constants.ts) — paste the same URL into **Google Play Console → App content → Privacy policy**.

### One-time GitHub setup

1. Create a public repo named **reyeltor-uz** under **eeshbaev95** (or push this project and update `PRIVACY_POLICY_URL` if the repo name differs).
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

Cloud build (recommended — avoids local NDK issues):

```bash
npx eas-cli build --platform android --profile production
```

Download the `.aab` from the Expo dashboard when the build finishes.

### 2. Play Console — create app

1. **Create app** → name **Reyeltor.uz**, default language, app/game, free.
2. **App content**
   - Privacy policy URL: `https://eeshbaev95.github.io/reyeltor-uz/privacy.html`
   - Complete Data safety, Ads (if none), Content rating, Target audience, News app (No), COVID (No), etc.
3. **Store listing**
   - Short & full description (Uzbek and/or English).
   - App icon: `assets/google-play-icon-512.png` (512×512).
   - Feature graphic: 1024×500 (create in Canva/Figma if needed).
   - Phone screenshots (min 2): capture from emulator or device.
4. **Release → Production** (or Internal testing first)
   - Upload the `.aab` from EAS.
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
