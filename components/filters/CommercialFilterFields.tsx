import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { CollapsibleFilterSection } from '@/components/filters/CollapsibleFilterSection';
import { DualCurrencyRange } from '@/components/filters/DualCurrencyRange';
import { FilterChip } from '@/components/filters/FilterChip';
import { FilterRangeInput } from '@/components/filters/FilterRangeInput';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSegmentedControl } from '@/components/filters/FilterSegmentedControl';
import { useFilterFieldStyles } from '@/components/filters/useFilterFieldStyles';
import { COMMERCIAL_PROPERTY_TYPES, LISTED_SINCE_OPTIONS } from '@/lib/constants/filterOptions';
import { translateListedSince, translatePropertyType } from '@/lib/i18n/filterLabels';
import { useTheme } from '@/lib/theme';
import type { ListingFilters } from '@/types';

interface CommercialFilterFieldsProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  usdRate: number;
}

export function CommercialFilterFields({ filters, onChange, usdRate }: CommercialFilterFieldsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useFilterFieldStyles();

  const propertyTypeSummary = filters.propertyType
    ? translatePropertyType(t, 'commercial', filters.propertyType)
    : t('filters.commercialTypes.any');

  const listedSinceKey =
    LISTED_SINCE_OPTIONS.find((opt) => opt.days === filters.listedSinceDays)?.key ?? 'any';
  const listedSinceSummary = translateListedSince(t, listedSinceKey);

  return (
    <>
      <FilterSection title={t('filters.transaction')} first>
        <FilterSegmentedControl
          options={[
            { value: 'sale' as const, label: t('filters.sale') },
            { value: 'lease' as const, label: t('filters.lease') },
          ]}
          value={filters.commercialTransaction}
          onChange={(commercialTransaction) => onChange({ ...filters, commercialTransaction })}
        />
      </FilterSection>

      <FilterSection title={t('filters.costRange')}>
        <DualCurrencyRange
          currency={filters.priceCurrency}
          onCurrencyChange={(priceCurrency) => onChange({ ...filters, priceCurrency })}
          priceMin={filters.priceMin}
          priceMax={filters.priceMax}
          onPriceMinChange={(priceMin) => onChange({ ...filters, priceMin })}
          onPriceMaxChange={(priceMax) => onChange({ ...filters, priceMax })}
          usdRate={usdRate}
        />
      </FilterSection>

      <CollapsibleFilterSection title={t('filters.propertyType')} summary={propertyTypeSummary}>
        <View style={styles.row}>
          {COMMERCIAL_PROPERTY_TYPES.map((type) => (
            <FilterChip
              key={`commercial-type-${type}`}
              label={translatePropertyType(t, 'commercial', type === 'any' ? null : type)}
              active={type === 'any' ? !filters.propertyType : filters.propertyType === type}
              onPress={() => onChange({ ...filters, propertyType: type === 'any' ? null : type })}
            />
          ))}
        </View>
      </CollapsibleFilterSection>

      <FilterSection title={t('filters.areaRange')}>
        <FilterRangeInput
          minValue={filters.areaMin}
          maxValue={filters.areaMax}
          onMinChange={(areaMin) => onChange({ ...filters, areaMin })}
          onMaxChange={(areaMax) => onChange({ ...filters, areaMax })}
          minPlaceholder={t('filters.min')}
          maxPlaceholder={t('filters.max')}
        />
      </FilterSection>

      <FilterSection title={t('filters.yearBuilt')}>
        <FilterRangeInput
          minValue={filters.yearBuiltMin}
          maxValue={filters.yearBuiltMax}
          onMinChange={(yearBuiltMin) => onChange({ ...filters, yearBuiltMin })}
          onMaxChange={(yearBuiltMax) => onChange({ ...filters, yearBuiltMax })}
          minPlaceholder={t('filters.min')}
          maxPlaceholder={t('filters.max')}
        />
      </FilterSection>

      <CollapsibleFilterSection title={t('filters.listedSince')} summary={listedSinceSummary}>
        <View style={styles.row}>
          {LISTED_SINCE_OPTIONS.map((opt) => (
            <FilterChip
              key={`listed-${opt.key}`}
              label={translateListedSince(t, opt.key)}
              active={filters.listedSinceDays === opt.days}
              onPress={() => onChange({ ...filters, listedSinceDays: opt.days })}
            />
          ))}
        </View>
      </CollapsibleFilterSection>

      <FilterSection title={t('filters.keywords')}>
        <TextInput
          style={styles.textArea}
          placeholder={t('filters.keywordsPlaceholder')}
          placeholderTextColor={theme.colors.tertiary}
          value={filters.keywords}
          onChangeText={(keywords) => onChange({ ...filters, keywords })}
        />
      </FilterSection>
    </>
  );
}
