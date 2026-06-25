import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageTopBar } from '@/components/i18n/LanguageTopBar';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface AuthScreenChromeProps {
  children: React.ReactNode;
  message?: string;
}

export function AuthScreenChrome({ children, message }: AuthScreenChromeProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <LanguageTopBar showBack />
      {message ? (
        <AppText variant="body" color="secondary" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    textAlign: 'center',
  },
});
