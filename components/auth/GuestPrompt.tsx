import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface GuestPromptProps {
  title: string;
  subtitle: string;
}

export function GuestPrompt({ title, subtitle }: GuestPromptProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LanguageTopBar />
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          },
        ]}
      >
      <AppText variant="h2" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" color="secondary" style={styles.subtitle}>
        {subtitle}
      </AppText>
      <Button label={t('auth.login')} onPress={() => router.push('/(tabs)/profile/login')} />
      <Button
        label={t('auth.register')}
        variant="secondary"
        onPress={() => router.push('/(tabs)/profile/register')}
        style={styles.secondary}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { textAlign: 'center', marginBottom: spacing.xl },
  secondary: { marginTop: spacing.sm },
});
