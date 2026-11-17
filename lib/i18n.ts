import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './constants';
import { supabase } from './supabase';

import en from '@/translations/en.json';
import ru from '@/translations/ru.json';
import tr from '@/translations/tr.json';
import uz from '@/translations/uz.json';
import zh from '@/translations/zh.json';

const resources = { uz, ru, en, zh, tr };

function normalizeLanguage(code: string): SupportedLanguage {
  const base = code.split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

function applyRtlForLanguage(_lng: SupportedLanguage): void {
  // RTL support disabled for current language set
  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }
}

/** Sync bootstrap so tabs/screens never mount before i18n exists (release-safe). */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function initI18n(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lng = stored ? normalizeLanguage(stored) : DEFAULT_LANGUAGE;
    applyRtlForLanguage(lng);
    if (lng !== i18n.language) {
      await i18n.changeLanguage(lng);
    }
  } catch (error) {
    console.warn('initI18n failed, keeping default language:', error);
  }
}

export async function changeLanguage(lng: SupportedLanguage): Promise<boolean> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (userId) {
    const { syncNotificationLocale, rescheduleAllLocalNotifications } = await import('@/lib/notifications');
    await syncNotificationLocale(userId, lng);
    await rescheduleAllLocalNotifications(userId);
  }

  // RTL not used for current language set
  return false;
}

export default i18n;
