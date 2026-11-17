# Translation Guidelines for Reyeltor-uz

## Overview

Reyeltor-uz supports 10 languages:
- **English** (en) - Default/fallback language
- **Uzbek** (uz)
- **Russian** (ru)
- **French** (fr)
- **German** (de)
- **Spanish** (es)
- **Chinese** (zh) - Simplified Chinese
- **Japanese** (ja)
- **Korean** (ko)
- **Arabic** (ar) - Right-to-left (RTL) language

All UI strings and error messages must be added to the i18n translation system to support all languages. **Hardcoded strings are not permitted.**

---

## 1. Key Naming Conventions

### Structure
Use dot notation with lowercase, camelCase segments:
```
domain.feature.specificKey
```

### Domains
- `tabs.*` - Main navigation tabs
- `list.*` - Listing display/search results
- `common.*` - Reusable UI strings
- `map.*` - Map interface
- `filters.*` - Filter options and labels
- `auth.*` - Authentication flows
- `post.*` - Listing posting
- `listing.*` - Listing creation & details
- `agent.*` - Agent profiles
- `profile.*` - User profile screens
- `notifications.*` - Notification settings
- `tools.*` - Calculator/utility tools
- `coins.*` - Coin/gamification system
- `privacy.*` - Legal pages
- `favorites.*` - Saved listings
- `growth.*` - Referral/growth features
- `errors.*` - Error messages (see Error Messages section)

### Examples
✓ Good:
```
errors.auth.signInFailed
errors.listing.addressLookupFailed
errors.network.connectionTimeout
filters.residentialTypes.apartment
profile.bioCharCount
```

✗ Bad:
```
error_auth_signin_failed
authSignInFailed
ERRORS.AUTH.SIGNIN_FAILED
```

---

## 2. Adding New Strings

### Step 1: Create the i18n Key
Choose appropriate domain and key:
```typescript
// Example: New feature "Quick Listing"
'quickListing.description': 'Post your property in 2 minutes'
```

### Step 2: Add to English First
Edit `translations/en.json` and add the key with English text:
```json
{
  "translation": {
    "quickListing": {
      "description": "Post your property in 2 minutes",
      "step1": "Choose type",
      "step2": "Add photos"
    }
  }
}
```

### Step 3: Add to All Other Languages
**IMPORTANT:** Add the same keys to all 9 other language files. Use English as placeholder initially, then get professional translation:

```bash
# Copy the key structure to all language files
cp translations/en.json translations/uz.json
cp translations/en.json translations/ru.json
# ... repeat for all languages
```

Then provide translations for each language.

### Step 4: Use in Code
```typescript
import { useTranslation } from 'react-i18next';

export function QuickListingScreen() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('quickListing.description')}</Text>
      <Button title={t('quickListing.step1')} />
    </View>
  );
}
```

---

## 3. Error Messages

All error messages must use the `errors.*` namespace:

### Error Categories
- `errors.auth.*` - Sign in, sign up, password reset
- `errors.listing.*` - Posting, updating, deleting listings
- `errors.profile.*` - Profile updates, check-in
- `errors.map.*` - Map operations
- `errors.network.*` - Network/connection issues
- `errors.storage.*` - AsyncStorage, database, file access
- `errors.permissions.*` - Camera, location, photos
- `errors.media.*` - Image processing, uploads
- `errors.ui.*` - UI component errors

### Example: Adding an Error Message

1. Create the key in `translations/en.json`:
```json
{
  "errors": {
    "listing": {
      "photoUploadFailed": "Could not upload photo. Check your internet connection and try again."
    }
  }
}
```

2. Add to all other language files (provide translations)

3. Use in code:
```typescript
import i18n from '@/lib/i18n';

try {
  await uploadPhoto(file);
} catch (error) {
  console.error(i18n.t('errors.listing.photoUploadFailed'), error);
  Alert.alert(t('common.error'), t('errors.listing.photoUploadFailed'));
}
```

### Console vs User-Facing
- **Console messages**: For debugging only, log the original error object
  ```typescript
  console.error(i18n.t('errors.listing.photoUploadFailed'), error);
  ```

- **User-facing errors**: Show translated message in Alert/Toast
  ```typescript
  Alert.alert(t('common.error'), t('errors.listing.photoUploadFailed'));
  ```

---

## 4. Variable Interpolation

Use double-brace placeholders:

### In JSON:
```json
{
  "profile.bioCharCount": "{{count}} / {{max}}",
  "filters.districtsSelected": "{{count}} districts selected",
  "auth.resetPasswordSent": "We sent a password reset link to {{email}}."
}
```

### In Code:
```typescript
<Text>{t('profile.bioCharCount', { count: 50, max: 200 })}</Text>
<Text>{t('filters.districtsSelected', { count: 3 })}</Text>
<Text>{t('auth.resetPasswordSent', { email: user.email })}</Text>
```

---

## 5. Pluralization

For strings that change based on count:

### In JSON:
```json
{
  "listing.photosHint_one": "{{count}} slot remaining",
  "listing.photosHint_other": "{{count}} slots remaining"
}
```

### In Code:
```typescript
<Text>{t('listing.photosHint', { count: 1 })}</Text>  // "1 slot remaining"
<Text>{t('listing.photosHint', { count: 5 })}</Text>  // "5 slots remaining"
```

---

## 6. RTL (Right-to-Left) Languages

Arabic (and Persian/Urdu if added) are RTL languages.

### Checklist:
- ✓ Text direction is automatically handled by `I18nManager` in React Native
- ✓ Verify layouts don't have hardcoded left/right positioning
- ✓ Use `flexDirection: 'row'` (doesn't need reversal—handled automatically)
- ✓ Avoid margins like `marginLeft: 10` (use `marginStart` instead)

### Current RTL Setup:
- `lib/i18n.ts` automatically enables RTL when language is Arabic
- `I18nManager.allowRTL(true)` and `I18nManager.forceRTL(true)` are called
- No additional code needed for RTL support

---

## 7. Language-Specific Notes

### Uzbek (uz)
- Cyrillic script
- No special pluralization rules
- Standard formatting

### Russian (ru)
- Cyrillic script
- Complex pluralization (1 / 2-4 / 5+ forms)
- Already handled by i18next

### Chinese (zh)
- No spaces between words—test carefully for text wrapping
- Simplified Chinese only (not Traditional)
- Numbers and English words may not have spaces

### Japanese (ja)
- No spaces between words
- Hiragana, Katakana, Kanji
- Text wrapping needs careful testing

### Korean (ko)
- No spaces between words
- Hangul script
- Text wrapping needs careful testing

### Arabic (ar)
- **RTL language** (automatic via I18nManager)
- Diacritical marks are important for pronunciation
- Already verified in current builds

---

## 8. Adding Translations for New Keys

### Option 1: Google Translate (Quick)
```bash
# Use googletrans library
python3 << 'EOF'
from googletrans import Translator
translator = Translator()

text = "Failed to upload photo"
for lang_code in ['ar', 'de', 'es', 'fr', 'ja', 'ko', 'ru', 'uz', 'zh']:
    result = translator.translate(text, src_language='en', dest_language=lang_code)
    print(f"{lang_code}: {result.text}")
EOF
```

### Option 2: Professional Translation (Recommended)
Create a CSV export of keys and send to professional translators:

```csv
key,english_text,language,translation
errors.listing.photoUploadFailed,"Could not upload photo",uz,Fotografi yuklash imkonsiz
errors.listing.photoUploadFailed,"Could not upload photo",ru,Не удалось загрузить фото
```

### Option 3: Community Translation
Request community contributors to provide translations for new keys.

---

## 9. Testing Your Translations

### 1. Check JSON Syntax
```bash
python3 -m json.tool translations/en.json > /dev/null && echo "Valid"
```

### 2. Check for Missing Keys
After adding new keys, verify all 10 language files have them:
```typescript
// In your test file
const enKeys = Object.keys(en.translation);
const uzKeys = Object.keys(uz.translation);
const missing = enKeys.filter(k => !uzKeys.includes(k));
console.log('Missing in uz:', missing);
```

### 3. Test in App
```typescript
import { useTranslation } from 'react-i18next';

export function DebugScreen() {
  const { t, i18n } = useTranslation();
  
  return (
    <View>
      <Text>Current language: {i18n.language}</Text>
      <Text>Your new key: {t('yourDomain.yourKey')}</Text>
      <Button
        title="Change language"
        onPress={() => i18n.changeLanguage('es')}
      />
    </View>
  );
}
```

---

## 10. Common Mistakes

### ❌ Mistake 1: Hardcoded Strings
```typescript
// WRONG
Alert.alert('Error', 'Could not load profile');

// RIGHT
Alert.alert(t('common.error'), t('errors.profile.loadFailed'));
```

### ❌ Mistake 2: Missing Keys in Other Languages
```json
// WRONG - en.json has key, but ru.json doesn't
// en.json: { "profile": { "newKey": "New feature" } }
// ru.json: { "profile": {} }

// RIGHT - all languages have the same keys
// en.json: { "profile": { "newKey": "New feature" } }
// ru.json: { "profile": { "newKey": "Новая функция" } }
```

### ❌ Mistake 3: Direct Translations (Copy-paste issues)
```typescript
// WRONG
const message = `Welcome ${user.name}`;

// RIGHT
const message = t('welcome.greeting', { name: user.name });
// In JSON: "welcome.greeting": "Welcome {{name}}"
```

### ❌ Mistake 4: Nested Structure Mismatch
```json
// WRONG - inconsistent nesting
{ "profile": { "bioCharCount": "50/200" } }
// vs
{ "profile.bioCharCount": "50/200" }

// RIGHT - consistent dot notation and proper nesting
{ "profile": { "bio": { "charCount": "50/200" } } }
```

---

## 11. Pre-Commit Checklist

Before committing changes that add new UI strings:

- [ ] All hardcoded strings removed (no `'string'` or `"string"` in UI)
- [ ] New keys added to `translations/en.json`
- [ ] Same keys exist in all 9 other language files
- [ ] JSON files validate with `python3 -m json.tool`
- [ ] Code uses `t('key')` or `i18n.t('key')`
- [ ] Variable interpolation uses `{{varName}}` format
- [ ] Error messages use `errors.*` namespace
- [ ] No console output of English strings (use i18n.t())
- [ ] RTL-safe layouts (no hardcoded left/right positioning)
- [ ] Tested language switching in app

---

## 12. Adding a New Language

If adding support for a new language (e.g., Persian):

1. Create `translations/fa.json` with all keys from `translations/en.json`
2. Add to `SUPPORTED_LANGUAGES` in `lib/constants.ts`
3. Import and register in `lib/i18n.ts`
4. Add language option to language picker UI
5. Set up RTL if needed (Persian is also RTL)
6. Test all screens in new language

---

## Resources

- i18next documentation: https://www.i18next.com/
- React-i18next: https://react.i18next.com/
- Language codes (ISO 639-1): https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- RTL in React Native: https://reactnative.dev/docs/i18nmanager

---

## Questions?

If unclear about translations or i18n setup, review:
- `lib/i18n.ts` - i18n initialization
- `translations/*.json` - Current translation files
- Existing components using `useTranslation()` hook
- Git history for examples of translation additions

Last updated: August 2026
