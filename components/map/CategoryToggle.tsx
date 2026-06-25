import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { hapticLight } from '@/lib/haptics';
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

export function CategoryToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { filters, setFilters } = useListingsCache();
  const residentialColors = getCategoryColors(theme.scheme, 'residential');
  const commercialColors = getCategoryColors(theme.scheme, 'commercial');

  return (
    <View style={styles.mapWrap}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceElevated,
            ...Platform.select({
              ios: {
                shadowColor: '#000000',
                shadowOpacity: theme.isDark ? 0.35 : 0.14,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 3 },
              },
              android: { elevation: 5 },
              default: {
                boxShadow: theme.isDark
                  ? '0 3px 12px rgba(0,0,0,0.35)'
                  : '0 3px 12px rgba(0,0,0,0.14)',
              },
            }),
          },
        ]}
      >
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
      </View>
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
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: active ? activeColor : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        <AppText variant="label" color={active ? 'onAccent' : 'primary'}>
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
  },
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
  },
});
