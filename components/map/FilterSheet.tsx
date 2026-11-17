import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommercialFilterFields } from '@/components/filters/CommercialFilterFields';
import { FilterSegmentedControl } from '@/components/filters/FilterSegmentedControl';
import { ResidentialFilterFields } from '@/components/filters/ResidentialFilterFields';
import { AppText } from '@/components/ui/AppText';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { countActiveFilters, countFilterResults } from '@/lib/filters';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { hapticLight } from '@/lib/haptics';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useExchangeRate } from '@/lib/hooks/useExchangeRate';
import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';
import { SHEET_BEHIND_TAB_Z_INDEX } from '@/lib/sheetChrome';
import { spacing, useTheme } from '@/lib/theme';
import type { ListingFilters, ListingWithPhotos } from '@/types';

interface FilterSheetProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  onApply: () => void;
  onClear: () => void;
  allListings: ListingWithPhotos[];
  onIndexChange?: (index: number) => void;
  /** When mounted already open (map mounts sheet only while visible). */
  initialIndex?: number;
}

const FILTER_SHEET_HEIGHT = '80%';
/** Clear + Apply row height (matches footer styles below). */
const FILTER_FOOTER_HEIGHT = 52 + spacing.sm + 4 + spacing.sm;

export const FilterSheet = forwardRef<BottomSheet, FilterSheetProps>(
  ({ filters, onChange, onApply, onClear, allListings, onIndexChange, initialIndex = -1 }, ref) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { usdRate } = useExchangeRate();
    const activeFilterCount = countActiveFilters(filters);
    const tabBarPadding = Math.max(insets.bottom, spacing.sm) + TAB_BAR_CLEARANCE;
    const footerBlockHeight = FILTER_FOOTER_HEIGHT + tabBarPadding;
    const [sheetIndex, setSheetIndex] = useState(initialIndex);

    const snapPoints = useMemo(() => [FILTER_SHEET_HEIGHT], []);
    const animationConfigs = useBottomSheetSpringConfigs({
      damping: 68,
      stiffness: 420,
      mass: 0.6,
    });

    const resultCount = useMemo(
      () => countFilterResults(allListings, filters, usdRate),
      [allListings, filters, usdRate],
    );
    const residentialColors = getCategoryColors(theme.scheme, 'residential');
    const commercialColors = getCategoryColors(theme.scheme, 'commercial');
    const categoryAccent = filters.category === 'residential' ? residentialColors.main : commercialColors.main;
    const categoryOnAccent = filters.category === 'residential' ? residentialColors.onMain : commercialColors.onMain;

    const clearPress = useAnimatedPress(() => {
      hapticLight();
      onClear();
    });
    const applyPress = useAnimatedPress(() => {
      hapticLight();
      onApply();
    });

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      [],
    );

    const setCategory = (category: ListingFilters['category']) => {
      hapticLight();
      onChange({
        ...filters,
        category,
        residentialTransaction: null,
        commercialTransaction: null,
        propertyType: null,
        roomsMin: null,
        bathroomsMin: null,
        views: [],
        level: null,
      });
    };

    const handleSheetChange = useCallback(
      (index: number) => {
        setSheetIndex(index);
        onIndexChange?.(index);
      },
      [onIndexChange],
    );

    const scrollBottomPadding = footerBlockHeight + spacing.sm;
    const styles = useMemo(() => createStyles(theme), [theme]);

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.colors.border,
                paddingBottom: tabBarPadding,
              },
            ]}
          >
            <Pressable
              onPressIn={clearPress.onPressIn}
              onPressOut={clearPress.onPressOut}
              onPress={clearPress.handlePress}
              style={styles.clearPress}
            >
              <Animated.View style={[styles.clearButton, { transform: [{ scale: clearPress.scale }] }]}>
                <AppText variant="label" style={{ fontWeight: '600' }}>
                  {t('common.clearAll')}
                </AppText>
              </Animated.View>
            </Pressable>

            <Pressable
              onPressIn={applyPress.onPressIn}
              onPressOut={applyPress.onPressOut}
              onPress={applyPress.handlePress}
              style={styles.applyPress}
            >
              <Animated.View
                style={[
                  styles.applyButton,
                  { backgroundColor: categoryAccent, transform: [{ scale: applyPress.scale }] },
                ]}
              >
                <AppText variant="label" color="onAccent" style={{ fontWeight: '700' }}>
                  {t('filters.results', { count: resultCount })}
                </AppText>
              </Animated.View>
            </Pressable>
          </View>
        </BottomSheetFooter>
      ),
      [
        applyPress,
        categoryAccent,
        clearPress,
        resultCount,
        t,
        tabBarPadding,
        theme.colors.border,
        styles,
      ],
    );

    return (
      <BottomSheet
        ref={ref}
        index={initialIndex}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        footerComponent={renderFooter}
        bottomInset={0}
        {...BOTTOM_SHEET_GESTURE_PROPS}
        enableContentPanningGesture={false}
        enableHandlePanningGesture={sheetIndex >= 0}
        style={styles.sheet}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          overScrollMode="never"
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <AppText variant="h2" style={styles.title}>
                {t('filters.title')}
              </AppText>
              {activeFilterCount > 0 ? (
                <AppText variant="caption" color="secondary">
                  {t('filters.results', { count: resultCount })}
                </AppText>
              ) : (
                <AppText variant="caption" color="secondary">
                  {t('map.filterTooltip')}
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.categoryCard}>
            <FilterSegmentedControl
              options={[
                { value: 'residential' as const, label: t('filters.residential') },
                { value: 'commercial' as const, label: t('filters.commercial') },
              ]}
              value={filters.category}
              onChange={(category) => category && setCategory(category)}
              allowDeselect={false}
              activeColor={categoryAccent}
              activeTextColor={categoryOnAccent}
            />
          </View>

          {filters.category === 'residential' ? (
            <ResidentialFilterFields key="residential-filters" filters={filters} onChange={onChange} usdRate={usdRate} />
          ) : (
            <CommercialFilterFields key="commercial-filters" filters={filters} onChange={onChange} usdRate={usdRate} />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

FilterSheet.displayName = 'FilterSheet';

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    sheet: { zIndex: SHEET_BEHIND_TAB_Z_INDEX },
    sheetBackground: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    handle: {
      backgroundColor: theme.colors.borderStrong,
      width: 44,
      height: 4,
      marginTop: spacing.sm,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    header: {
      marginBottom: spacing.lg,
      paddingTop: spacing.xs,
    },
    headerCopy: {
      gap: spacing.xs,
    },
    title: {
      letterSpacing: -0.5,
    },
    categoryCard: {
      marginBottom: spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      gap: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.background,
    },
    clearPress: { flex: 1 },
    applyPress: { flex: 1.5 },
    clearButton: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.surface,
    },
    applyButton: {
      minHeight: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: '#2563EB',
          shadowOpacity: 0.28,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 4 },
      }),
    },
  });
}
