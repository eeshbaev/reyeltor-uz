import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { uzsToUsd } from '@/lib/exchange/cbuRate';
import { fontSize, spacing, useTheme } from '@/lib/theme';
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
        wrap: { marginTop: spacing.md },
        currencyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
        currencyPill: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
        },
        currencyPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
        currencyText: { fontWeight: '600', color: theme.colors.primary },
        currencyTextActive: { color: theme.colors.onAccent },
        rateNote: { fontSize: fontSize.xs, color: theme.colors.secondary, marginBottom: spacing.sm },
        row: { flexDirection: 'row', gap: spacing.sm },
        inputWrap: { flex: 1 },
        input: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 8,
          padding: spacing.sm,
          fontSize: fontSize.md,
          backgroundColor: theme.colors.surfaceElevated,
          color: theme.colors.primary,
        },
        hint: { fontSize: fontSize.xs, color: theme.colors.secondary, marginTop: 4 },
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
      <View style={styles.currencyRow}>
        {(['UZS', 'USD'] as PriceCurrency[]).map((c) => (
          <Pressable
            key={c}
            style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
            onPress={() => onCurrencyChange(c)}
          >
            <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.rateNote}>
        {t('filters.cbuRate', { rate: usdRate.toLocaleString('uz-UZ') })}
      </Text>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder={t('filters.min')}
            keyboardType="numeric"
            value={priceMin}
            onChangeText={onPriceMinChange}
          />
          {convertedHint(priceMin) ? <Text style={styles.hint}>{convertedHint(priceMin)}</Text> : null}
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder={t('filters.max')}
            keyboardType="numeric"
            value={priceMax}
            onChangeText={onPriceMaxChange}
          />
          {convertedHint(priceMax) ? <Text style={styles.hint}>{convertedHint(priceMax)}</Text> : null}
        </View>
      </View>
    </View>
  );
}
