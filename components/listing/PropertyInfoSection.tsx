import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { translatePropertyLevel, translatePropertyType, translatePropertyView } from '@/lib/i18n/filterLabels';
import { enrichListing, getListingCategory, getListingPropertyType } from '@/lib/listing';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface PropertyInfoSectionProps {
  listing: ListingWithPhotos;
  locale: string;
  usdRate?: number;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.colors.background,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <AppText variant="micro" color="tertiary" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="label" numberOfLines={2} style={styles.tileValue}>
        {value}
      </AppText>
    </View>
  );
}

export function PropertyInfoSection({ listing, locale, usdRate = 12_017 }: PropertyInfoSectionProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const enriched = useMemo(() => enrichListing(listing), [listing]);
  const category = getListingCategory(enriched);
  const propertyType = getListingPropertyType(enriched);

  const rows: { label: string; value: string }[] = [];

  rows.push({ label: t('listing.category'), value: t(`filters.${category}`) });

  const transactionLabel =
    enriched.type === 'rent'
      ? t('filters.rent')
      : enriched.type === 'lease'
        ? t('filters.lease')
        : t('filters.sale');
  rows.push({ label: t('filters.transaction'), value: transactionLabel });

  if (propertyType) {
    rows.push({
      label: t('filters.propertyType'),
      value: translatePropertyType(t, category, propertyType),
    });
  }

  if (category === 'residential' && enriched.rooms > 0) {
    rows.push({ label: t('filters.rooms'), value: String(enriched.rooms) });
  }

  if (enriched.bathrooms != null && enriched.bathrooms > 0) {
    rows.push({ label: t('filters.bathrooms'), value: String(enriched.bathrooms) });
  }

  if (enriched.area_m2 > 0) {
    rows.push({ label: t('common.area'), value: `${enriched.area_m2} m²` });
  }

  if (enriched.floor != null) {
    const floorText = `${enriched.floor}${enriched.total_floors ? `/${enriched.total_floors}` : ''}`;
    rows.push({ label: t('common.floor'), value: floorText });
  } else if (enriched.total_floors != null) {
    rows.push({ label: t('listing.totalFloors'), value: String(enriched.total_floors) });
  }

  if (enriched.year_built != null && enriched.year_built > 0) {
    rows.push({ label: t('filters.yearBuilt'), value: String(enriched.year_built) });
  }

  if (enriched.property_views && enriched.property_views.length > 0) {
    rows.push({
      label: t('filters.viewFromProperty'),
      value: enriched.property_views.map((v) => translatePropertyView(t, v)).join(', '),
    });
  }

  if (enriched.level) {
    rows.push({ label: t('filters.level'), value: translatePropertyLevel(t, enriched.level) });
  }

  if (enriched.district) {
    rows.push({ label: t('common.district'), value: enriched.district });
  }

  if (enriched.posted_at) {
    rows.push({ label: t('listing.listedSince'), value: formatDate(enriched.posted_at, locale) });
  }

  if (enriched.price > 0) {
    rows.push({
      label: t('listing.priceUsd'),
      value: `≈ $${Math.round(enriched.price / usdRate).toLocaleString('en-US')}`,
    });
  }

  if (rows.length === 0) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <AppText variant="h3" style={styles.title}>
        {t('listing.propertyInfo')}
      </AppText>
      <View style={styles.grid}>
        {rows.map((row, index) => (
          <InfoTile key={`${row.label}-${index}`} label={row.label} value={row.value} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 },
    }),
  },
  title: {
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    gap: 4,
  },
  tileValue: {
    fontWeight: '600',
    letterSpacing: -0.15,
  },
});
