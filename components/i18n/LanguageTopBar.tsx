import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown';
import { BackButton } from '@/components/navigation/BackButton';
import type { SupportedLanguage } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { changeLanguage } from '@/lib/i18n';

interface LanguageTopBarProps {
  showBack?: boolean;
  backHref?: string;
  backFallbackHref?: string;
}

export function LanguageTopBar({
  showBack = false,
  backHref,
  backFallbackHref = '/(tabs)/map',
}: LanguageTopBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    const needsRestart = await changeLanguage(lang);
    if (needsRestart) Alert.alert(t('profile.language'), t('profile.restartRequired'));
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      {showBack ? <BackButton href={backHref} fallbackHref={backFallbackHref} /> : null}
      <View style={styles.spacer} />
      <LanguageDropdown onSelect={handleLanguageChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  spacer: { flex: 1 },
});
