import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { FilterRangeInput } from '@/components/filters/FilterRangeInput';
import { FilterSegmentedControl } from '@/components/filters/FilterSegmentedControl';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { uzsToUsd } from '@/lib/exchange/cbuRate';
import { spacing, useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

interface DualCurrencyRangeProps {
  currency: PriceCurrency;
  onCurrencyChange: (currency: PriceCurrency) => void;
  priceMin: string;
  priceMax: string;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  usdRate: number;
}

export function DualCurrencyRange({
  currency,
  onCurrencyChange,
  priceMin,
  priceMax,
  onPriceMinChange,
  onPriceMaxChange,
  usdRate,
}: DualCurrencyRangeProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { gap: spacing.md },
        rateNote: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          backgroundColor: theme.isDark ? 'rgba(59,130,246,0.12)' : theme.colors.accentSurface,
          alignSelf: 'flex-start',
        },
      }),
    [theme],
  );

  const convertedHint = (value: string) => {
    const num = Number(value.replace(/\s/g, ''));
    if (!Number.isFinite(num) || num <= 0) return null;
    if (currency === 'UZS') {
      const usd = uzsToUsd(num, usdRate);
      return `≈ $${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    const uzs = Math.round(num * usdRate);
    return `≈ ${uzs.toLocaleString('uz-UZ')} UZS`;
  };

  return (
    <View style={styles.wrap}>
      <FilterSegmentedControl
        options={[
          { value: 'UZS' as const, label: 'UZS' },
          { value: 'USD' as const, label: 'USD' },
        ]}
        value={currency}
        onChange={(next) => next && onCurrencyChange(next)}
        allowDeselect={false}
      />
      <View style={styles.rateNote}>
        <AppText variant="micro" color="accent" style={{ fontWeight: '600' }}>
          {t('filters.cbuRate', { rate: usdRate.toLocaleString('uz-UZ') })}
        </AppText>
      </View>
      <FilterRangeInput
        minValue={priceMin}
        maxValue={priceMax}
        onMinChange={onPriceMinChange}
        onMaxChange={onPriceMaxChange}
        minPlaceholder={t('filters.min')}
        maxPlaceholder={t('filters.max')}
        minHint={convertedHint(priceMin)}
        maxHint={convertedHint(priceMax)}
      />
    </View>
  );
}
