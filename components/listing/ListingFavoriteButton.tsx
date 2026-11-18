import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useListingFavorite } from '@/lib/hooks/useListingFavorite';
import { useTheme } from '@/lib/theme';

interface ListingFavoriteButtonProps {
  listingId: string;
  variant?: 'icon' | 'action' | 'actionIcon' | 'overlay';
  size?: number;
  /** Use RNGH touchable — required inside map carousel cards. */
  gestureHandler?: boolean;
}

export function ListingFavoriteButton({
  listingId,
  variant = 'icon',
  size = 24,
  gestureHandler = false,
}: ListingFavoriteButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isFavorite, toggleFavorite } = useListingFavorite(listingId);
  const accessibilityLabel = isFavorite ? t('favorites.remove') : t('favorites.add');
  const iconColor = isFavorite ? theme.colors.danger : variant === 'overlay' ? fixedColors.white : theme.colors.text;
  const iconName = isFavorite ? 'heart' : 'heart-outline';
  const actionLabel = isFavorite ? t('favorites.remove') : t('common.save');

  if (variant === 'action') {
    return (
      <TouchableOpacity
        style={[styles.action, { borderColor: theme.colors.border }]}
        onPress={toggleFavorite}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isFavorite }}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
        <AppText variant="label" numberOfLines={1}>
          {actionLabel}
        </AppText>
      </TouchableOpacity>
    );
  }

  if (variant === 'actionIcon') {
    return (
      <TouchableOpacity
        style={[styles.actionIcon, { borderColor: theme.colors.border }]}
        onPress={toggleFavorite}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isFavorite }}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
      </TouchableOpacity>
    );
  }

  if (variant === 'overlay') {
    if (gestureHandler) {
      return (
        <TouchableOpacity
          onPress={toggleFavorite}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ selected: isFavorite }}
          style={styles.overlayHit}
          hitSlop={8}
        >
          <FrostedView style={styles.overlayButton} intensity={60}>
            <Ionicons name={iconName} size={20} color={iconColor} />
          </FrostedView>
        </TouchableOpacity>
      );
    }

    return (
      <Pressable
        onPress={toggleFavorite}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isFavorite }}
        style={styles.overlayHit}
        hitSlop={8}
      >
        <FrostedView style={styles.overlayButton} intensity={60}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </FrostedView>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={toggleFavorite}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isFavorite }}
      style={styles.iconBtn}
    >
      <Ionicons name={iconName} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  actionIcon: {
    minWidth: 46,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  overlayHit: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 4,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
