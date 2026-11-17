import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MyListingsEmptyIllustration } from '@/components/profile/MyListingsEmptyIllustration';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface MyListingsEmptyStateProps {
  variant: 'active' | 'archived';
  onPost?: () => void;
}

export function MyListingsEmptyState({ variant, onPost }: MyListingsEmptyStateProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isActive = variant === 'active';

  return (
    <View style={styles.wrap}>
      <View style={styles.illustration}>
        <MyListingsEmptyIllustration />
      </View>
      <AppText variant="h2" style={styles.title}>
        {isActive ? t('profile.myListingsActiveEmptyTitle') : t('profile.myListingsArchivedEmptyTitle')}
      </AppText>
      <AppText variant="body" color="secondary" style={styles.hint}>
        {isActive ? t('profile.myListingsActiveEmptyHint') : t('profile.myListingsArchivedEmptyHint')}
      </AppText>

      {isActive && onPost ? (
        <Button label={t('profile.postFirstListing')} onPress={onPost} style={styles.cta} />
      ) : (
        <View style={[styles.tip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.tipIcon, { backgroundColor: theme.colors.accentSurface }]}>
            <Ionicons name="archive-outline" size={16} color={theme.colors.accent} />
          </View>
          <AppText variant="caption" color="secondary" style={styles.tipText}>
            {t('profile.myListingsArchivedTip')}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  illustration: {
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    maxWidth: 300,
  },
  hint: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  cta: {
    marginTop: spacing.xl,
    minWidth: 220,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 320,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
  },
});
