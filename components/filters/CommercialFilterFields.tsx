import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CollapsibleFilterSection } from '@/components/filters/CollapsibleFilterSection';
import { DualCurrencyRange } from '@/components/filters/DualCurrencyRange';
import { translateListedSince, translatePropertyType } from '@/lib/i18n/filterLabels';
import { useFilterFieldStyles } from '@/components/filters/useFilterFieldStyles';
import { COMMERCIAL_PROPERTY_TYPES, LISTED_SINCE_OPTIONS } from '@/lib/constants/filterOptions';
import type { ListingFilters } from '@/types';

interface CommercialFilterFieldsProps {
  filters: ListingFilters;
  onChange: (filters: ListingFilters) => void;
  usdRate: number;
}

export function CommercialFilterFields({ filters, onChange, usdRate }: CommercialFilterFieldsProps) {
  const { t } = useTranslation();
  const styles = useFilterFieldStyles();

  const propertyTypeSummary = filters.propertyType
    ? translatePropertyType(t, 'commercial', filters.propertyType)
    : t('filters.commercialTypes.any');

  const listedSinceKey =
    LISTED_SINCE_OPTIONS.find((opt) => opt.days === filters.listedSinceDays)?.key ?? 'any';
  const listedSinceSummary = translateListedSince(t, listedSinceKey);

  return (
    <>
      <Text style={styles.label}>{t('filters.transaction')}</Text>
      <View style={styles.row}>
        {(['sale', 'lease'] as const).map((tx) => (
          <Pressable
            key={tx}
            style={[styles.pill, filters.commercialTransaction === tx && styles.pillActive]}
            onPress={() =>
              onChange({
                ...filters,
                commercialTransaction: filters.commercialTransaction === tx ? null : tx,
              })
            }
          >
            <Text style={[styles.pillText, filters.commercialTransaction === tx && styles.pillTextActive]}>
              {t(`filters.${tx}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('filters.costRange')}</Text>
      <DualCurrencyRange
        currency={filters.priceCurrency}
        onCurrencyChange={(priceCurrency) => onChange({ ...filters, priceCurrency })}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onPriceMinChange={(priceMin) => onChange({ ...filters, priceMin })}
        onPriceMaxChange={(priceMax) => onChange({ ...filters, priceMax })}
        usdRate={usdRate}
      />

      <CollapsibleFilterSection title={t('filters.propertyType')} summary={propertyTypeSummary}>
        <View style={styles.row}>
          {COMMERCIAL_PROPERTY_TYPES.map((type) => (
            <Pressable
              key={`commercial-type-${type}`}
              style={[styles.pill, (type === 'any' ? !filters.propertyType : filters.propertyType === type) && styles.pillActive]}
              onPress={() => onChange({ ...filters, propertyType: type === 'any' ? null : type })}
            >
              <Text
                style={[
                  styles.pillText,
                  (type === 'any' ? !filters.propertyType : filters.propertyType === type) && styles.pillTextActive,
                ]}
              >
                {translatePropertyType(t, 'commercial', type === 'any' ? null : type)}
              </Text>
            </Pressable>
          ))}
        </View>
      </CollapsibleFilterSection>

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
