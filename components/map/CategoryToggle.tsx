import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';
import type { ListingFilters } from '@/types';

const CATEGORIES = ['residential', 'commercial'] as const;

function nextCategoryFilters(filters: ListingFilters, category: ListingFilters['category']): ListingFilters {
  if (filters.category === category) return filters;
  return {
    ...filters,
    category,
    residentialTransaction: null,
    commercialTransaction: null,
    propertyType: null,
    roomsMin: null,
    bathroomsMin: null,
    views: [],
    level: null,
  };
}

export function CategoryToggle({ variant: _variant }: { variant?: 'map' } = {}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { filters, setFilters } = useListingsCache();
  const residentialColors = getCategoryColors(theme.scheme, 'residential');
  const commercialColors = getCategoryColors(theme.scheme, 'commercial');

  return (
    <View style={styles.mapWrap}>
      <FrostedView style={[styles.container, mapChromeBorder(theme)]} intensity={76}>
        {CATEGORIES.map((category) => (
          <TogglePill
            key={category}
            label={t(`filters.${category}`)}
            active={filters.category === category}
            activeColor={category === 'residential' ? residentialColors.main : commercialColors.main}
            onPress={() => {
              hapticLight();
              setFilters(nextCategoryFilters(filters, category));
            }}
          />
        ))}
      </FrostedView>
    </View>
  );
}

function TogglePill({
  label,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) {
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} style={styles.pillPress}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: active ? activeColor : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        <AppText variant="caption" color={active ? 'onAccent' : 'secondary'} style={styles.pillText}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
    minWidth: 220,
    maxWidth: 280,
  },
  pillPress: {
    flex: 1,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
