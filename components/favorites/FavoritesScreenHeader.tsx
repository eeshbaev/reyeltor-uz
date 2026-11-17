import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface FavoritesScreenHeaderProps {
  count: number;
}

export function FavoritesScreenHeader({ count }: FavoritesScreenHeaderProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.leading}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.accentSurface }]}>
          <Ionicons name="heart" size={22} color={theme.colors.error} />
        </View>
        <View style={styles.copy}>
          <AppText variant="h1" style={styles.title}>
            {t('tabs.favorites')}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('favorites.subtitle')}
          </AppText>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <AppText variant="caption" color="accent" style={styles.badgeText}>
          {t('favorites.savedCount', { count })}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  leading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    letterSpacing: -0.6,
  },
  badge: {
    marginTop: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontWeight: '700',
  },
});
