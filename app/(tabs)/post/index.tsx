import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestPrompt } from '@/components/auth/GuestPrompt';
import { PostListingForm } from '@/components/post/PostListingForm';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/lib/context/AuthContext';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export default function PostTabScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <AppText variant="caption" color="secondary" style={{ marginTop: spacing.md }}>
          {t('common.loading')}
        </AppText>
      </View>
    );
  }

  if (!session) {
    return (
      <GuestPrompt title={t('post.guestTitle')} subtitle={t('post.guestSubtitle')} />
    );
  }

  return <PostListingForm bottomPadding={insets.bottom + 100} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
