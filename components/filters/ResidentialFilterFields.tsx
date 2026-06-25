import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CollapsibleFilterSection } from '@/components/filters/CollapsibleFilterSection';
import { DualCurrencyRange } from '@/components/filters/DualCurrencyRange';
import { FilterStepper } from '@/components/filters/FilterStepper';
import { useFilterFieldStyles } from '@/components/filters/useFilterFieldStyles';
import { translatePropertyLevel, translatePropertyType, translatePropertyView, translateListedSince } from '@/lib/i18n/filterLabels';
import {
  LISTED_SINCE_OPTIONS,
  PROPERTY_LEVELS,
  PROPERTY_VIEWS,
  RESIDENTIAL_PROPERTY_TYPES,
} from '@/lib/constants/filterOptions';
import type { ListingFilters } from '@/types';

interface ResidentialFilterFieldsProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  usdRate: number;
}

export function ResidentialFilterFields({ filters, onChange, usdRate }: ResidentialFilterFieldsProps) {
  const { t } = useTranslation();
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
      <Text style={styles.label}>{t('filters.transaction')}</Text>
      <View style={styles.row}>
        {(['rent', 'sale'] as const).map((tx) => (
          <Pressable
            key={tx}
            style={[styles.pill, filters.residentialTransaction === tx && styles.pillActive]}
            onPress={() =>
              onChange({
                ...filters,
                residentialTransaction: filters.residentialTransaction === tx ? null : tx,
              })
            }
          >
            <Text style={[styles.pillText, filters.residentialTransaction === tx && styles.pillTextActive]}>
              {t(`filters.${tx}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('filters.priceRange')}</Text>
      <DualCurrencyRange
        currency={filters.priceCurrency}
        onCurrencyChange={(priceCurrency) => onChange({ ...filters, priceCurrency })}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onPriceMinChange={(priceMin) => onChange({ ...filters, priceMin })}
        onPriceMaxChange={(priceMax) => onChange({ ...filters, priceMax })}
        usdRate={usdRate}
      />

      <FilterStepper
        label={t('filters.rooms')}
        value={filters.roomsMin}
        onChange={(roomsMin) => onChange({ ...filters, roomsMin })}
      />
      <FilterStepper
        label={t('filters.bathrooms')}
        value={filters.bathroomsMin}
        onChange={(bathroomsMin) => onChange({ ...filters, bathroomsMin })}
        max={8}
      />

      <Text style={styles.label}>{t('filters.areaRange')}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder={t('filters.min')}
          keyboardType="numeric"
          value={filters.areaMin}
          onChangeText={(areaMin) => onChange({ ...filters, areaMin })}
        />
        <TextInput
          style={styles.input}
          placeholder={t('filters.max')}
          keyboardType="numeric"
          value={filters.areaMax}
          onChangeText={(areaMax) => onChange({ ...filters, areaMax })}
        />
      </View>

      <CollapsibleFilterSection title={t('filters.propertyType')} summary={propertyTypeSummary}>
        <View style={styles.row}>
          {RESIDENTIAL_PROPERTY_TYPES.map((type) => (
            <Pressable
              key={`residential-type-${type}`}
              style={[styles.pill, (type === 'any' ? !filters.propertyType : filters.propertyType === type) && styles.pillActive]}
              onPress={() => onChange({ ...filters, propertyType: type === 'any' ? null : type })}
            >
              <Text
                style={[
                  styles.pillText,
                  (type === 'any' ? !filters.propertyType : filters.propertyType === type) && styles.pillTextActive,
                ]}
              >
                {translatePropertyType(t, 'residential', type === 'any' ? null : type)}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleFilterSection>

      <Text style={styles.label}>{t('filters.yearBuilt')}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder={t('filters.min')}
          keyboardType="numeric"
          value={filters.yearBuiltMin}
          onChangeText={(yearBuiltMin) => onChange({ ...filters, yearBuiltMin })}
        />
        <TextInput
          style={styles.input}
          placeholder={t('filters.max')}
          keyboardType="numeric"
          value={filters.yearBuiltMax}
          onChangeText={(yearBuiltMax) => onChange({ ...filters, yearBuiltMax })}
        />
      </View>

      <CollapsibleFilterSection title={t('filters.viewFromProperty')} summary={viewsSummary}>
        <View style={styles.row}>
          {PROPERTY_VIEWS.map((view) => (
            <Pressable
              key={`view-${view}`}
              style={[styles.pill, filters.views.includes(view) && styles.pillActive]}
              onPress={() => toggleView(view)}
            >
              <Text style={[styles.pillText, filters.views.includes(view) && styles.pillTextActive]}>
                {translatePropertyView(t, view)}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleFilterSection>

      <CollapsibleFilterSection title={t('filters.level')} summary={levelSummary}>
        <View style={styles.row}>
          {PROPERTY_LEVELS.map((level) => (
            <Pressable
              key={`level-${level}`}
              style={[styles.pill, filters.level === level && styles.pillActive]}
              onPress={() => onChange({ ...filters, level: filters.level === level ? null : level })}
            >
              <Text style={[styles.pillText, filters.level === level && styles.pillTextActive]}>
                {translatePropertyLevel(t, level)}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleFilterSection>

      <CollapsibleFilterSection title={t('filters.listedSince')} summary={listedSinceSummary}>
        <View style={styles.row}>
          {LISTED_SINCE_OPTIONS.map((opt) => (
            <Pressable
              key={`listed-${opt.key}`}
              style={[styles.pill, filters.listedSinceDays === opt.days && styles.pillActive]}
              onPress={() => onChange({ ...filters, listedSinceDays: opt.days })}
            >
              <Text style={[styles.pillText, filters.listedSinceDays === opt.days && styles.pillTextActive]}>
                {translateListedSince(t, opt.key)}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleFilterSection>

      <Text style={styles.label}>{t('filters.keywords')}</Text>
      <TextInput
        style={styles.textArea}
        placeholder={t('filters.keywordsPlaceholder')}
        value={filters.keywords}
        onChangeText={(keywords) => onChange({ ...filters, keywords })}
      />
    </>
  );
}
