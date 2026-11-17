import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface FavoritesGuestBannerProps {
  onPress: () => void;
}

export function FavoritesGuestBanner({ onPress }: FavoritesGuestBannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.press}>
      <FrostedView style={styles.card}>
        <View style={[styles.icon, { backgroundColor: theme.colors.accentSurface }]}>
          <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.accent} />
        </View>
        <View style={styles.copy}>
          <AppText variant="label" style={styles.title}>
            {t('favorites.guestCard')}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('favorites.guestBannerHint')}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.tertiary} />
      </FrostedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 18,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: '600',
  },
});
