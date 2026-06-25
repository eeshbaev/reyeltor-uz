import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommercialFilterFields } from '@/components/filters/CommercialFilterFields';
import { ResidentialFilterFields } from '@/components/filters/ResidentialFilterFields';
import { useExchangeRate } from '@/lib/hooks/useExchangeRate';
import { countFilterResults } from '@/lib/filters';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { SHEET_BEHIND_TAB_Z_INDEX, sheetBottomInset } from '@/lib/sheetChrome';
import { fontSize, spacing, useTheme } from '@/lib/theme';
import type { ListingFilters, ListingWithPhotos } from '@/types';

interface FilterSheetProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  onApply: () => void;
  onClear: () => void;
  allListings: ListingWithPhotos[];
  onIndexChange?: (index: number) => void;
}

const screenHeight = Dimensions.get('window').height;
const FILTER_FOOTER_HEIGHT = 76;

export const FilterSheet = forwardRef<BottomSheet, FilterSheetProps>(
  ({ filters, onChange, onApply, onClear, allListings, onIndexChange }, ref) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { usdRate } = useExchangeRate();
    const tabBarClearance = sheetBottomInset(insets.bottom);
    const sheetHeight = Math.round(screenHeight * 0.92);
    const [sheetIndex, setSheetIndex] = useState(-1);

    const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);
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

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
      ),
      [],
    );

    const setCategory = (category: ListingFilters['category']) => {
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

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        enableContentPanningGesture
        enableHandlePanningGesture
        enableOverDrag={false}
        backdropComponent={renderBackdrop}
        onChange={(index) => {
          setSheetIndex(index);
          onIndexChange?.(index);
        }}
        bottomInset={0}
        containerStyle={sheetIndex < 0 ? styles.passThrough : undefined}
        style={styles.sheet}
        backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
      >
        <View style={styles.body}>
          <BottomSheetScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: theme.colors.primary }]}>{t('filters.title')}</Text>

            <View style={styles.categoryRow}>
              {(['residential', 'commercial'] as const).map((cat) => {
                const active = filters.category === cat;
                const colors = cat === 'residential' ? residentialColors : commercialColors;
                return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryPill,
                    {
                      borderColor: active ? colors.main : theme.colors.border,
                      backgroundColor: active ? colors.main : theme.colors.surface,
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: active ? colors.onMain : theme.colors.primary },
                    ]}
                  >
                    {t(`filters.${cat}`)}
                  </Text>
                </Pressable>
              );
              })}
            </View>

            {filters.category === 'residential' ? (
              <ResidentialFilterFields key="residential-filters" filters={filters} onChange={onChange} usdRate={usdRate} />
            ) : (
              <CommercialFilterFields key="commercial-filters" filters={filters} onChange={onChange} usdRate={usdRate} />
            )}
          </BottomSheetScrollView>

          <View
            style={[
              styles.footerBar,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderTopColor: theme.colors.border,
                paddingBottom: tabBarClearance,
              },
            ]}
          >
            <View style={styles.actions}>
              <Pressable
                style={[styles.clearButton, { borderColor: theme.colors.border }]}
                onPress={onClear}
              >
                <Text style={[styles.clearText, { color: theme.colors.primary }]}>{t('common.clearAll')}</Text>
              </Pressable>
              <Pressable
                style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
                onPress={onApply}
              >
                <Text style={[styles.applyText, { color: theme.colors.onAccent }]}>
                  {t('filters.results', { count: resultCount })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </BottomSheet>
    );
  },
);

FilterSheet.displayName = 'FilterSheet';

const styles = StyleSheet.create({
  sheet: { zIndex: SHEET_BEHIND_TAB_Z_INDEX },
  passThrough: { pointerEvents: 'none' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  categoryPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryText: { fontWeight: '700' },
  footerBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: FILTER_FOOTER_HEIGHT,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  clearButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearText: { fontWeight: '600' },
  applyButton: {
    flex: 1.4,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyText: { fontWeight: '700' },
});
