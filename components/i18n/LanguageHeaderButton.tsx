import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown';
import type { SupportedLanguage } from '@/lib/constants';
import { changeLanguage } from '@/lib/i18n';

export function LanguageHeaderButton() {
  const { t } = useTranslation();

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    const needsRestart = await changeLanguage(lang);
    if (needsRestart) Alert.alert(t('profile.language'), t('profile.restartRequired'));
  };

  return <LanguageDropdown onSelect={handleLanguageChange} />;
}
