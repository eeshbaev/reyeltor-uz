import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';
import { CollapsibleFilterSection } from '@/components/filters/CollapsibleFilterSection';
import { DualCurrencyRange } from '@/components/filters/DualCurrencyRange';
import { FilterChip } from '@/components/filters/FilterChip';
import { FilterRangeInput } from '@/components/filters/FilterRangeInput';
import { FilterSection } from '@/components/filters/FilterSection';
import { FilterSegmentedControl } from '@/components/filters/FilterSegmentedControl';
import { FilterStepper } from '@/components/filters/FilterStepper';
import { useFilterFieldStyles } from '@/components/filters/useFilterFieldStyles';
import {
  LISTED_SINCE_OPTIONS,
  PROPERTY_LEVELS,
  PROPERTY_VIEWS,
  RESIDENTIAL_PROPERTY_TYPES,
} from '@/lib/constants/filterOptions';
import { translatePropertyLevel, translatePropertyType, translatePropertyView, translateListedSince } from '@/lib/i18n/filterLabels';
import { useTheme } from '@/lib/theme';
import type { ListingFilters } from '@/types';

interface ResidentialFilterFieldsProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  usdRate: number;
}

export function ResidentialFilterFields({ filters, onChange, usdRate }: ResidentialFilterFieldsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useFilterFieldStyles();

  const toggleView = (view: (typeof PROPERTY_VIEWS)[number]) => {
    const views = filters.views.includes(view) ? filters.views.filter((v) => v !== view) : [...filters.views, view];
    onChange({ ...filters, views });
  };

  const propertyTypeSummary = filters.propertyType
    ? translatePropertyType(t, 'residential', filters.propertyType)
    : t('filters.residentialTypes.any');

  const viewsSummary =
    filters.views.length === 0
      ? null
      : filters.views.map((view) => translatePropertyView(t, view)).join(', ');

  const levelSummary = filters.level ? translatePropertyLevel(t, filters.level) : null;

  const listedSinceKey =
    LISTED_SINCE_OPTIONS.find((opt) => opt.days === filters.listedSinceDays)?.key ?? 'any';
  const listedSinceSummary = translateListedSince(t, listedSinceKey);

  return (
    <>
      <FilterSection title={t('filters.transaction')} first>
        <FilterSegmentedControl
          options={[
            { value: 'rent' as const, label: t('filters.rent') },
            { value: 'sale' as const, label: t('filters.sale') },
          ]}
          value={filters.residentialTransaction}
          onChange={(residentialTransaction) => onChange({ ...filters, residentialTransaction })}
        />
      </FilterSection>

      <FilterSection title={t('filters.priceRange')}>
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

      <FilterSection title={t('filters.rooms')}>
        <FilterStepper
          label={t('filters.rooms')}
          value={filters.roomsMin}
          onChange={(roomsMin) => onChange({ ...filters, roomsMin })}
          showLabel={false}
          embedded
        />
      </FilterSection>

      <FilterSection title={t('filters.bathrooms')}>
        <FilterStepper
          label={t('filters.bathrooms')}
          value={filters.bathroomsMin}
          onChange={(bathroomsMin) => onChange({ ...filters, bathroomsMin })}
          max={8}
          showLabel={false}
          embedded
        />
      </FilterSection>

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

      <CollapsibleFilterSection title={t('filters.propertyType')} summary={propertyTypeSummary}>
        <View style={styles.row}>
          {RESIDENTIAL_PROPERTY_TYPES.map((type) => (
            <FilterChip
              key={`residential-type-${type}`}
              label={translatePropertyType(t, 'residential', type === 'any' ? null : type)}
              active={type === 'any' ? !filters.propertyType : filters.propertyType === type}
              onPress={() => onChange({ ...filters, propertyType: type === 'any' ? null : type })}
            />
          ))}
        </View>
      </CollapsibleFilterSection>

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

      <CollapsibleFilterSection title={t('filters.viewFromProperty')} summary={viewsSummary}>
        <View style={styles.row}>
          {PROPERTY_VIEWS.map((view) => (
            <FilterChip
              key={`view-${view}`}
              label={translatePropertyView(t, view)}
              active={filters.views.includes(view)}
              onPress={() => toggleView(view)}
            />
          ))}
        </View>
      </CollapsibleFilterSection>

      <CollapsibleFilterSection title={t('filters.level')} summary={levelSummary}>
        <View style={styles.row}>
          {PROPERTY_LEVELS.map((level) => (
            <FilterChip
              key={`level-${level}`}
              label={translatePropertyLevel(t, level)}
              active={filters.level === level}
              onPress={() => onChange({ ...filters, level: filters.level === level ? null : level })}
            />
          ))}
        </View>
      </CollapsibleFilterSection>

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
