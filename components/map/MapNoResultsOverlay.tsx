import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import {
  getNoResultsReason,
  hasAreaSearch,
  hasSearchFiltersActive,
  type NoResultsReason,
} from '@/lib/filters';
import { spacing } from '@/lib/design/spacing';
import type { ListingFilters, ListingWithPhotos } from '@/types';

interface MapNoResultsOverlayProps {
  listings: ListingWithPhotos[];
  filters: ListingFilters;
  usdRate: number;
  bottomOffset: number;
  onResetFilters: () => void;
  onResetArea: () => void;
}

export function MapNoResultsOverlay({
  listings,
  filters,
  usdRate,
  bottomOffset,
  onResetFilters,
  onResetArea,
}: MapNoResultsOverlayProps) {
  const { t } = useTranslation();

  const reason = useMemo(
    () => getNoResultsReason(listings, filters, usdRate),
    [listings, filters, usdRate],
  );

  if (reason === 'none') return null;

  const title = messageForReason(reason, t);
  const showResetFilters = hasSearchFiltersActive(filters);
  const showResetArea = hasAreaSearch(filters);

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <FrostedView style={styles.card}>
        <AppText variant="body" color="secondary" style={styles.title}>
          {title}
        </AppText>
        {showResetFilters ? (
          <Button label={t('map.resetFilters')} onPress={onResetFilters} style={styles.btn} />
        ) : null}
        {showResetArea ? (
          <Button
            label={t('map.resetArea')}
            variant="secondary"
            onPress={onResetArea}
            style={styles.btnSecondary}
          />
        ) : null}
      </FrostedView>
    </View>
  );
}

function messageForReason(
  reason: NoResultsReason,
  t: (key: string) => string,
): string {
  switch (reason) {
    case 'area':
      return t('map.noResultsArea');
    case 'filters':
      return t('map.noResultsFilters');
    case 'both':
      return t('map.noResultsBoth');
    case 'empty':
      return t('map.noListingsHere');
    default:
      return t('map.noListings');
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 14,
  },
  card: {
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'stretch',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  btn: { marginTop: 0 },
  btnSecondary: { marginTop: spacing.sm },
});
