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

import uz from '@/translations/uz.json';
import ru from '@/translations/ru.json';
import en from '@/translations/en.json';
import fr from '@/translations/fr.json';
import de from '@/translations/de.json';
import es from '@/translations/es.json';
import zh from '@/translations/zh.json';
import ja from '@/translations/ja.json';
import ko from '@/translations/ko.json';
import ar from '@/translations/ar.json';

const resources = { uz, ru, en, fr, de, es, zh, ja, ko, ar };

function normalizeLanguage(code: string): SupportedLanguage {
  const base = code.split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

export async function initI18n(): Promise<void> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const lng = stored ? normalizeLanguage(stored) : DEFAULT_LANGUAGE;

  const isRtl = lng === 'ar';
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

export async function changeLanguage(lng: SupportedLanguage): Promise<boolean> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
  const isRtl = lng === 'ar';
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
    return true;
  }
  return false;
}

export default i18n;
