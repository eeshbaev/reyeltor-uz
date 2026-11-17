import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestPrompt } from '@/components/auth/GuestPrompt';
import { PostListingForm } from '@/components/post/PostListingForm';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/lib/context/AuthContext';
import { screenBottomPadding } from '@/lib/design/layout';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export default function PostTabScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <AppText variant="caption" color="secondary" style={styles.loadingText}>
          {t('common.loading')}
        </AppText>
      </View>
    );
  }

  if (!session) {
    return <GuestPrompt title={t('post.guestTitle')} subtitle={t('post.guestSubtitle')} />;
  }

  return <PostListingForm bottomPadding={screenBottomPadding(insets.bottom)} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md },
});
