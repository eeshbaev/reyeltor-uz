# Professional Translation Guidelines
## Reyeltor-uz Real Estate Mobile Application

**For Professional Translators**  
**Version 1.0 | August 2026**

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Terminology Guide](#terminology-guide)
3. [Style Guide](#style-guide)
4. [App Context](#app-context)
5. [Language-Specific Notes](#language-specific-notes)
6. [Quality Standards](#quality-standards)
7. [Technical Requirements](#technical-requirements)

---

## Project Overview

### What is Reyeltor-uz?
**Reyeltor-uz** is a mobile real estate application for finding and listing properties in Tashkent, Uzbekistan. The app allows users to:
- Search for residential and commercial properties
- Post property listings
- View property details and neighborhood information
- Manage favorites and referrals
- Use financial tools (mortgage calculator, price history)

### Target Languages
- **Russian** (23 million speakers, primary in Central Asia)
- **French** (275 million speakers, global)
- **German** (130 million speakers, Europe)
- **Spanish** (485 million speakers, global)
- **Chinese** (922 million speakers, Asia)
- **Japanese** (125 million speakers, Asia)
- **Korean** (82 million speakers, Asia)
- **Arabic** (422 million speakers, Middle East/N. Africa)

### User Demographics
- **Primary:** Tashkent residents (mix of local and international users)
- **Age:** 25-55 years old (property buyers/renters/agents)
- **Tech literacy:** Intermediate to high
- **Use case:** Serious property search/sale, not casual browsing

### Translation Scope
- **1,380 strings** across 8 languages
- **165-192 strings per language** (varying by language)
- **22 missing keys** (priority: HIGH)
- **143-170 untranslated strings per language** (currently showing English)

---

## Terminology Guide

### A. Real Estate Terms

**Property Types:**
| English | Context | Notes |
|---------|---------|-------|
| Listing | A property advertisement | Core term, appears 100+ times |
| Property | General real estate asset | Alternative to "listing" |
| Residential | Apartment buildings, houses | Legal classification |
| Commercial | Office, retail, warehouse | Legal classification |
| Apartment | Multi-unit residential building | Most common in Tashkent |
| Townhouse | Attached residential units | Less common |
| Duplex | Two-unit residential | Less common |
| Loft | Converted industrial space | Modern/trendy |
| Condo / Strata | Co-ownership building | Legal term |
| Vacant land | Undeveloped property | For future development |
| Parking | Parking space/garage | Standalone listing type |
| Mansion | Large luxury house | High-end property |
| Country house | Rural residential property | Suburban/rural |

**Transaction Types:**
- **Rent** - Lease property short/long term
- **Buy** - Purchase property (sale)
- **Lease** - Long-term rental agreement

**Property Details:**
| English | Uzbek Equivalent | Notes |
|---------|-------------------|-------|
| Room | Xona | Bedroom count (1-room, 2-room, etc.) |
| Floor | Qavat | Building level (1st, 2nd, etc.) |
| Area | Yuzasi (m²) | Square meters |
| District | Tuman | Administrative division in Tashkent |
| Price | Narx | In UZS or USD |
| Furnished | Mebellar bilan | Includes furniture |
| Unfurnished | Bo'sh | No furniture |
| Built-in Kitchen | O'rnatilgan oshxona | Kitchen fixtures included |

**Tashkent Districts (DO NOT TRANSLATE):**
- Yunusobod
- Chilanzar
- Sergeli
- Mirabad
- Shayhantaur
- Uchtepa
- Yashnabad
- Bektemir
- Olmazor
- Navoi
- Almazar

### B. App-Specific Terms

| English | Definition | Consistency |
|---------|-----------|-------------|
| Favorites | Saved/bookmarked listings | Use "saved" as alternative |
| Check-in | Daily reward claim (gaming) | Don't translate literally |
| Coins | Reward currency (in-app) | Game mechanic, keep consistent |
| Referral | Friend invitation bonus | Reward program term |
| Engagement | User interaction metrics | Internal/technical |
| View count | Number of times listing viewed | Engagement metric |
| Flag / Report | Report inappropriate content | User moderation feature |

### C. UI Component Names (Translate Context, Not Name)

These refer to app features and should be translated in context:
- **Tabs** - Bottom navigation buttons (Map, List, Post, Favorites, Profile)
- **Filters** - Search parameters (price, rooms, district, etc.)
- **Sheet** - Bottom panel that slides up
- **Alert** - Pop-up notification/confirmation
- **Modal** - Full-screen overlay
- **Chip** - Small button/tag (districts selected)

---

## Style Guide

### Tone & Voice

**Target Tone:** Professional but Friendly
- Use formal address (vous in French, Sie in German)
- Avoid slang or colloquialisms
- Be clear and concise
- Show empathy in error messages

**Examples:**

❌ "Oops! Something broke!"  
✅ "We encountered an error. Please try again."

❌ "Gimme a sec..."  
✅ "Loading your profile..."

### Formality Level

| Language | Formality | Address Form |
|----------|-----------|--------------|
| Russian | Formal | Вы (formal you) |
| French | Formal | Vous (formal you) |
| German | Formal | Sie (formal you) |
| Spanish | Neutral | Usted (formal you) |
| Chinese | Neutral | 您 (formal you) |
| Japanese | Formal | 敬語 (respectful form) |
| Korean | Formal | 존댓말 (formal speech) |
| Arabic | Standard | Modern Standard Arabic |

### Capitalization

- **First letter of sentences:** Always capitalize
- **Proper nouns:** Always capitalize (Tashkent, Reyeltor, etc.)
- **Button labels:** Capitalize first word ("Save listing", not "save listing")
- **Headlines:** Title case per language convention

### Punctuation

- **Question marks:** Always end questions with "?"
- **Periods:** Use periods at end of complete sentences
- **Ellipsis:** Use "..." for loading/thinking states
- **Dashes:** Use em-dash (—) for emphasis, en-dash (–) for ranges
- **Quotation marks:** Use language-appropriate quotes ("quotes" or «guillemets»)

### Numbers & Currency

**Format by Language:**
- **Russian:** 1 000 000 ₽ (space separator, Ruble symbol)
- **French:** 1 000 000 € (space separator, Euro symbol)
- **German:** 1.000.000 € (dot separator, Euro symbol)
- **Spanish:** 1.000.000 € (dot separator, Euro symbol)
- **Chinese:** ¥1,000,000 (no space, Yuan symbol)
- **Japanese:** ¥1,000,000 (no space, Yen symbol)
- **Korean:** ₩1,000,000 (no space, Won symbol)
- **Arabic:** ١٬٠٠٠٬٠٠٠ ر.ع.‏ (Arabic numerals, optional currency)

**Currencies in App:**
- UZS (Uzbek Sum) - Local currency
- USD (US Dollar) - International reference

Example in CSV: "common.usd" = "USD" (DO NOT TRANSLATE - currency code)

### Date & Time Format

- **Russian:** 25.12.2026 (DD.MM.YYYY)
- **French:** 25/12/2026 (DD/MM/YYYY)
- **German:** 25.12.2026 (DD.MM.YYYY)
- **Spanish:** 25/12/2026 (DD/MM/YYYY)
- **Chinese:** 2026年12月25日 (YYYY年MM月DD日)
- **Japanese:** 2026年12月25日 (YYYY年MM月DD日)
- **Korean:** 2026.12.25 (YYYY.MM.DD)
- **Arabic:** 25/12/2026 (DD/MM/YYYY)

---

## App Context

### User Flows & Screen Context

**1. Authentication Flow**
- Sign up / Log in screens
- Password reset emails
- Account verification

**Key Strings:**
- "Sign in" - Initial login
- "Sign up" - Create new account
- "Reset password" - Forgot password
- "Confirm email" - Email verification
- Error: "Email already registered"
- Error: "Cannot reach server"

---

**2. Listing Search & Browse**
- Map view (geographic search)
- List view (card-based results)
- Filters (price, rooms, type, district)
- Favorites (saved listings)

**Key Strings:**
- "Map" - Tab label (navigation)
- "List" - Tab label (navigation)
- "Filters" - Search refinement
- "Clear all" - Reset filters
- "No listings found" - Empty state
- "Showing {{count}} listings" - Result count

---

**3. Listing Detail**
- Full property information
- Photos gallery
- Price history
- Neighborhood amenities
- Agent contact

**Key Strings:**
- "Cover" - Feature photo label
- "Exact location" - GPS coordinates
- "Share listing" - Social sharing
- "Add to favorites" - Bookmark action
- "Remove" - Unbookmark action
- Neighborhood items: "Metro", "Park", "School", "Hospital", "Restaurant"

---

**4. Post Listing (Seller Flow)**
- Property type selection
- Photo upload
- Details form
- Location picker
- Price entry
- Publish

**Key Strings:**
- "Post a listing" - Feature name
- "Choose type" - Step 1
- "Add photos" - Photo upload
- "Building & views" - Property detail section
- "Enter price" - Price field
- "Confirm location" - Map confirmation
- "Building picker" - Snap to building on map
- Success: "Listing published on the map!"

---

**5. Profile**
- User information
- Telegram/phone contact
- Bio/description
- My listings (active/archived)
- Referral code
- Settings

**Key Strings:**
- "Profile information" - Section header
- "Telegram username" - Contact method
- "Public contact" - Visible to buyers
- "Bio" - Self-description
- "Complete your profile" - Setup wizard
- Success: "Profile information saved"

---

**6. Tools**
- Mortgage calculator
- Currency converter
- Price history charts
- District comparison

**Key Strings:**
- "Mortgage" - Loan calculator
- "Currency history" - Exchange rate chart
- "Compare districts" - Multi-district analysis
- Chart titles contain variables: "USD/UZS — {{period}}"

---

### Error Messages & Contexts

When translating error messages, consider:
- **User empathy** - They're frustrated
- **Clarity** - Explain what went wrong
- **Solution** - Suggest how to fix it
- **Tone** - Helpful, not accusatory

**Example Error Patterns:**

❌ "Failed to submit flag"  
✅ "We couldn't submit your report. Please check your connection and try again."

❌ "Network error"  
✅ "No connection. Check your internet and try again."

---

## Language-Specific Notes

### Russian (Русский)

**Unique Features:**
- Gendered nouns affect adjectives and past tense
- Pluralization: 1 квартира, 2-4 квартиры, 5+ квартир
- Formal address: Вы (capital V)
- Cyrillic script

**Pluralization Rules:**
- 1 комната (1 room)
- 2-4 комнаты (2-4 rooms)
- 5-20 комнат (5-20 rooms)
- 21 комната (21 rooms)
- 22-24 комнаты (22-24 rooms)
- Pattern repeats for 5-9 in tens, 25-29, etc.

**Key Terminology:**
- Квартира (apartment) - most common
- Дом (house)
- Помещение (premises/space)
- Объявление (listing)
- Район (district)

**Example Translations:**
- "Add to favorites" → "Добавить в избранное"
- "Remove photo" → "Удалить фото"
- "Please try again" → "Пожалуйста, попробуйте еще раз"

---

### French (Français)

**Unique Features:**
- Gendered nouns (masculine/feminine)
- Plural agreements on adjectives
- Formal address: Vous
- Accents and diacritics are important

**Pluralization:**
- Most nouns add "s" in plural (but silent)
- Agreement with articles: le/la → les, un/une → des

**Key Terminology:**
- Annonce (listing)
- Bien immobilier (property)
- Quartier (district)
- Habitation (residence)

**Example Translations:**
- "Add to favorites" → "Ajouter aux favoris"
- "Clear all" → "Effacer tout"
- "Listing published" → "Annonce publiée sur la carte!"

**Avoid:**
- English words like "listing" - use "annonce"
- "favorite" - use "favoris"

---

### German (Deutsch)

**Unique Features:**
- Gendered nouns (masculine/feminine/neuter)
- Complex capitalization (all nouns capitalized)
- Compound words are common
- Formal address: Sie (capital S)

**Grammar:**
- Agreement: der Mann, die Frau, das Kind
- Plural: -e, -en, -er, -s endings
- Compound words: Immobilienangebot (property listing)

**Key Terminology:**
- Angebot (listing/offer)
- Immobilie (real estate)
- Wohnung (apartment)
- Haus (house)
- Bezirk (district)

**Example Translations:**
- "Add to favorites" → "Zu Favoriten hinzufügen"
- "Residential" → "Wohnimmobilie"
- "Property information" → "Immobiliendaten"

**Capitalization Rule:**
- Nouns: Erste Buchstabe (first letter capitalized)
- Titles: "Immobilie Aktualisiert" (title case)

---

### Spanish (Español)

**Unique Features:**
- Gendered nouns (masculine/feminine)
- Conjugated verbs by subject
- Accents on certain vowels (á, é, í, ó, ú)
- Formal/informal distinction (Usted vs tú)

**Pluralization:**
- Masculine: el, un → los, unos
- Feminine: la, una → las, unas
- Most add "s" (casa → casas, precio → precios)

**Key Terminology:**
- Anuncio (listing)
- Propiedad (property)
- Inmueble (real estate)
- Apartamento (apartment)
- Barrio / Distrito (district)

**Example Translations:**
- "Add to favorites" → "Agregar a favoritos"
- "Listing published" → "¡Anuncio publicado en el mapa!"
- "Building & views" → "Edificio y vistas"

**Avoid:**
- Intermediate vs Neutral Spanish differences - use Neutral Spanish
- Regional slang - use universal terms

---

### Chinese (中文 - Simplified)

**Unique Features:**
- No spaces between words
- No plurals (quantity expressed with counters/numbers)
- Measure words (个, 套, etc.)
- Simplified characters (not Traditional)
- Formal/informal tone via word choice

**Characteristics:**
- Subject-Object-Verb order optional
- Counters: 一个房间 (one [counter] room)
- Reading left-to-right (not classical right-to-left)

**Key Terminology:**
- 房源 (fángyuán) - listing
- 房产 (fángchǎn) - property/real estate
- 公寓 (gōngyù) - apartment
- 房子 (fángzi) - house
- 地区 (dìqū) - district

**Example Translations:**
- "Add to favorites" → "添加到收藏"
- "Map" → "地图"
- "Listing published" → "房源已发布到地图！"

**Technical Note:**
- Watch line breaks - Chinese text is dense
- Test on device to ensure proper wrapping

---

### Japanese (日本語)

**Unique Features:**
- Three writing systems: Hiragana, Katakana, Kanji
- No spaces between words
- Formal/informal speech levels (敬語)
- Topic marker は distinguishes subject

**Writing Systems:**
- Hiragana ひらがな - Phonetic script
- Katakana カタカナ - Foreign words/technical
- Kanji 漢字 - Meaning-bearing characters

**Formality Levels:**
- 敬語 (keigo) - Respectful/polite form (use in app)
- 丁寧形 (teineikei) - Polite form with ます
- 普通形 (futsukei) - Casual form (avoid)

**Key Terminology:**
- 物件 (bukken) - listing/property
- 不動産 (fudōsan) - real estate
- 部屋 (heya) - room
- 住宅 (jūtaku) - house/residence
- 地区 (chiku) / 地域 (chiiki) - district

**Example Translations:**
- "Add to favorites" → "お気に入りに追加"
- "Map" → "地図"
- "Listing published" → "物件がマップに公開されました!"

**Technical Notes:**
- Use ひらがな for common words when possible (easier to read)
- Use カタカナ for foreign/technical terms
- Test on device - no word spaces makes layout tricky

---

### Korean (한국어)

**Unique Features:**
- Hangul alphabet (phonetic)
- No spaces between words
- Formal/informal speech levels (존댓말/반말)
- Subject-Object-Verb word order

**Formality:**
- 존댓말 (jondaetmal) - Formal/polite (use in app)
- 반말 (banmal) - Casual/informal (avoid)
- Particles (은/는, 을/를) change based on preceding sound

**Key Terminology:**
- 부동산 (budongsan) - real estate
- 물건 (mulgun) - listing
- 아파트 (apateu) - apartment
- 방 (bang) - room
- 지역 (jiyeok) - district

**Example Translations:**
- "Add to favorites" → "즐겨찾기에 추가"
- "Map" → "지도"
- "Listing published" → "매물이 지도에 게시되었습니다!"

**Technical Notes:**
- Watch word-breaking (no spaces)
- Test special characters and diacriticals
- Ensure formal speech level throughout

---

### Arabic (العربية)

**Unique Features:**
- Right-to-left (RTL) text direction
- Gendered nouns (masculine/feminine)
- Consonant root system
- Modern Standard Arabic (not dialect)

**Grammar:**
- Nouns: masculine/feminine, singular/dual/plural
- Verbs: conjugate by subject
- Feminine adds ة (ta marbuta) usually
- Plurals: regular (-ات/-ان/-يين) or irregular

**Direction:**
- Text flows right-to-left
- Numbers flow left-to-right (standard)
- Punctuation appears on left in RTL context

**Key Terminology:**
- إعلان (i'lān) - listing/advertisement
- عقار (ʿqār) - real estate
- شقة (shiqqa) - apartment
- منزل (manzil) - house
- منطقة (mintaqa) - district

**Example Translations:**
- "Add to favorites" → "إضافة إلى المفضلة"
- "Map" → "الخريطة"
- "Listing published" → "تم نشر الإعلان على الخريطة!"

**Technical Notes:**
- App handles RTL automatically
- Verify diacriticals (تشكيل) not needed for Modern Standard Arabic
- Test on device for layout (buttons, alignment)
- Some words may need diacriticals for clarity (rare)

**Variant Note:**
- Use Modern Standard Arabic (Arabic used in media/formal contexts)
- Not Egyptian, Saudi, or other dialectal Arabic

---

## Quality Standards

### Completeness Checklist

Before submitting translations, verify:

- [ ] **All keys translated** - No empty cells in "TRANSLATOR: ENTER TRANSLATION HERE" column
- [ ] **No English text remains** - Don't translate "Current Value" column (template only)
- [ ] **Variable placeholders preserved** - {{count}}, {{email}}, {{period}} remain exactly as-is
- [ ] **Punctuation matches pattern** - Periods, question marks, ellipsis in original
- [ ] **No typos or grammar errors** - Run spell-check in native language
- [ ] **Consistent terminology** - Same term used for same concept throughout
- [ ] **Formatting preserved** - Brackets, hyphens, apostrophes intact
- [ ] **Proper capitalization** - First letters capitalized per language rules

### Natural Language Check

Read translations aloud. They should:
- [ ] Sound natural to native speakers
- [ ] Use common, standard terminology (not overly technical)
- [ ] Avoid word-for-word English translation patterns
- [ ] Maintain appropriate formality level
- [ ] Make sense in app context (you received the screenshots)

### Examples of Quality Issues

❌ **Too literal (bad):**
- English: "No longer available"
- Bad: "Already no more available" (word-for-word Russian)
- Good: "Больше недоступно" or "Снято с продажи"

❌ **Wrong formality (bad):**
- English: "Save your profile"
- Bad: "Сохрани свой профиль" (informal, too casual)
- Good: "Сохраните ваш профиль" (formal)

❌ **Inconsistent terminology (bad):**
- Same key translated two different ways in CSV
- Bad: Квартира, then Жилое помещение for same concept
- Good: Always use "Квартира" consistently

---

## Technical Requirements

### File Format

**CSV File Format:**
- Encoding: UTF-8
- Delimiter: Comma (,)
- Line endings: LF (Unix)
- Quotes: Double quotes ("") for fields with commas

**Example Valid Row:**
```
listing.postSuccess,"Listing published on the map!","Listing published on the map!","E'lon xaritada e'lon qilindi!",listing,
```

### Variable Placeholders

**Recognized Variables:**
- `{{count}}` - Number of items
- `{{email}}` - Email address
- `{{name}}` - Person's name
- `{{district}}` - District name
- `{{price}}` - Property price
- `{{period}}` - Time period (week, month, year)
- `{{rate}}` - Exchange rate
- `{{max}}` - Maximum value
- `{{lat}}` - Latitude
- `{{lng}}` - Longitude

**Rules:**
- Do NOT translate variable names
- Keep exact format: `{{variableName}}`
- If variable in middle of sentence, maintain grammar
- Example: "{{count}} listings found" → "Найдено {{count}} объявлений"

### Character Restrictions

- **Maximum characters per string:** 150 (soft limit, contact if exceeded)
- **Forbidden characters:** None (all Unicode supported)
- **Font support:** Arabic, Chinese, Japanese, Korean fully supported
- **RTL support:** Automatic for Arabic (handled by app)

### Encoding Issues to Avoid

- ❌ Do NOT use HTML entities (&nbsp;, &amp;, etc.)
- ❌ Do NOT convert smart quotes (" ") to straight quotes (" ")
- ❌ Do NOT replace dashes with hyphens or underscores
- ✅ Use literal characters (UTF-8 encoding handles all)

---

## Submission & Feedback

### Delivery Format
1. Complete CSV file with all translations filled in
2. Column 4 ("TRANSLATOR: ENTER TRANSLATION HERE") completely filled
3. UTF-8 encoding, with filename: `translations_[LANGUAGE].csv`
4. Example: `translations_ru.csv`, `translations_fr.csv`

### Revision Process
After initial submission, you may receive feedback:
- Specific items flagged for revision
- Reason for revision (terminology, clarity, formality)
- Updated CSV with revision requests
- Revision deadline (typically 2-3 days)

### Quality Review Criteria
- Completeness (all strings translated)
- Consistency (terminology consistent)
- Accuracy (faithful to original meaning)
- Natural phrasing (sounds native)
- Context awareness (understands real estate domain)
- Technical correctness (variables preserved)

---

## Support & Questions

### Common Questions

**Q: What if there's no direct translation for a term?**  
A: Use the closest equivalent and add a note in Notes column. Example:
- English: "Loft"
- Note: "Modern/trendy space, may use city-specific term"

**Q: Can I modify variables like {{count}}?**  
A: No. Variables must remain exactly as provided. They're filled by the app at runtime.

**Q: What about Uzbek spelling in Russian words?**  
A: Use Russian spellings. Transliterate Uzbek place names if needed but keep proper nouns (district names) as-is.

**Q: How formal should I be?**  
A: Professional but friendly. Imagine a real estate professional helping a friend.

**Q: Should I translate brand names?**  
A: No. Keep brand names, app names, and proper nouns (like "Telegram", "Reyeltor") as-is.

---

## Glossary Template (Per Language)

Use this for reference and consistency:

### Russian Glossary (Example)
| English | Russian | Context | Frequency |
|---------|---------|---------|-----------|
| Listing | Объявление | Property ad | Very High |
| Property | Недвижимость | Real estate asset | High |
| Apartment | Квартира | Flat/apartment | Very High |
| District | Район | Admin division | High |
| Price | Цена | Cost in UZS/USD | Very High |
| Save | Сохранить | Button action | High |
| Error | Ошибка | Problem occurred | Medium |

**Create similar glossary for your language as you translate.**

---

## Timeline & Expectations

- **Translation time:** 1-2 weeks (depending on volume and language)
- **Revision time:** 3-5 days (if revisions needed)
- **Approval:** Within 2 days of revision submission
- **Payment:** 50% upfront, 50% upon approval

---

## Final Checklist Before Submission

**Translation Quality:**
- [ ] All 165-192 strings translated
- [ ] All variables ({{...}}) preserved exactly
- [ ] Consistent terminology throughout
- [ ] Natural phrasing in native language
- [ ] Proper punctuation and capitalization
- [ ] No typos or grammar errors

**Technical:**
- [ ] UTF-8 encoding
- [ ] CSV format correct
- [ ] Filename: `translations_[LANG].csv`
- [ ] No HTML entities or smart quotes
- [ ] Special characters preserved

**Context:**
- [ ] Reviewed real estate terminology
- [ ] Considered app context (UI/error messages)
- [ ] Language-specific rules applied
- [ ] Tone consistent (formal but friendly)

---

## Thank You!

Your professional translation will bring Reyeltor-uz to **{{count}} million** users in {{language_name}}.

For questions: [Translator Contact Email]  
Project Manager: [Project Manager Contact]  
Due Date: [Specific Date]

---

**Version:** 1.0  
**Last Updated:** August 2026  
**Status:** Ready for Translation
