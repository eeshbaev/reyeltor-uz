import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { translatePropertyLevel, translatePropertyType, translatePropertyView } from '@/lib/i18n/filterLabels';
import { enrichListing, getListingCategory, getListingPropertyType } from '@/lib/listing';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

interface PropertyInfoSectionProps {
  listing: ListingWithPhotos;
  locale: string;
  usdRate?: number;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

export function PropertyInfoSection({ listing, locale, usdRate = 12_017 }: PropertyInfoSectionProps) {
  const { t } = useTranslation();
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
    <View style={styles.wrap}>
      <AppText variant="h3" style={styles.title}>
        {t('listing.propertyInfo')}
      </AppText>
      {rows.map((row, index) => (
        <InfoRow key={`${row.label}-${index}`} label={row.label} value={row.value} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  title: { marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  label: { flex: 1 },
  value: { flex: 1.2, textAlign: 'right' },
});
