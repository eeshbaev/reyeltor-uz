export const TASHKENT_CITY_DISTRICTS = [
  'Bektemir',
  'Chilanzar',
  'Hamza',
  'Mirobod',
  'Mirzo Ulugbek',
  'Olmazor',
  'Sergeli',
  'Shaykhontohur',
  'Uchtepa',
  'Yakkasaroy',
  'Yashnobod',
  'Yunusobod',
  'Yangihayot',
] as const;

export const TASHKENT_REGION_DISTRICTS = [
  'Angren',
  'Bekobod',
  'Boʻka',
  'Chinoz',
  'Qibray',
  'Ohangaron',
  'Oqqoʻrgʻon',
  'Parkent',
  'Piskent',
  'Quyichirchiq',
  'Toshkent tumani',
  'Yangiyoʻl',
  'Zangiota',
] as const;

export const TASHKENT_DISTRICTS = [
  ...TASHKENT_CITY_DISTRICTS,
  ...TASHKENT_REGION_DISTRICTS,
] as const;

export type MapCoverage = 'city' | 'region';

export const MAP_COVERAGE_BOUNDS = {
  city: [69.10, 41.20, 69.44, 41.40] as [number, number, number, number],
  region: [68.70, 40.75, 70.20, 41.70] as [number, number, number, number],
};

/** Keep the map focused on greater Tashkent. [west, south, east, north] */
export const TASHKENT_MAP_MAX_BOUNDS: [number, number, number, number] = [68.55, 40.65, 70.35, 41.80];

/** Street-level zoom when opening a listing from detail screens. */
export const LISTING_MAP_FOCUS_ZOOM = 15;

export const MAP_COVERAGE_CENTER = {
  city: { latitude: 41.2995, longitude: 69.2401, zoom: 12 },
  region: { latitude: 41.22, longitude: 69.32, zoom: 10 },
};

export const TASHKENT_CENTER = {
  latitude: 41.2995,
  longitude: 69.2401,
  zoom: 12,
} as const;

export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_RADIUS = 60;

export const WELCOME_COINS = 15;
export const CHECKIN_COINS = 1;
export const LISTING_EXPIRY_DAYS = 90;
export const ARCHIVE_DELETE_DAYS = 30;

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en', 'fr', 'de', 'es', 'zh', 'ja', 'ko', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'uz';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
};

export const LANGUAGE_STORAGE_KEY = '@reyeltor/language';
export const GUEST_FAVORITES_KEY = '@reyeltor/guest_favorites';
export const GUEST_FAVORITE_SNAPSHOTS_KEY = '@reyeltor/guest_favorite_snapshots';
export const DEVICE_ID_KEY = '@reyeltor/device_id';
export const FILTER_TOOLTIP_KEY = '@reyeltor/filter_tooltip_dismissed';
export const DISPLAY_CURRENCY_KEY = '@reyeltor/display_currency';
export const LIST_SWIPE_HINT_KEY = '@reyeltor/list_swipe_hint';
export const MY_LISTINGS_HINT_KEY = '@reyeltor/my_listings_hint';
export const POST_DRAFT_KEY = '@reyeltor/post_draft';

export const PRIVACY_CONTACT_EMAIL = 'privacy@reyeltor.uz';

/** Public privacy policy (GitHub Pages). Use in Google Play Console and in-app link. */
export const PRIVACY_POLICY_URL = 'https://eeshbaev95.github.io/reyeltor-uz/privacy.html';

export const APP_NAME = 'Reyeltor.uz';
export const APP_HOME_URL = 'https://reyeltor.uz';

export const CHECKIN_DAYS = [2, 4, 6]; // Tuesday, Thursday, Saturday (0=Sunday)
