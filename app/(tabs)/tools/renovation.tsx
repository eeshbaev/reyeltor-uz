import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { CurrencyPills } from '@/components/tools/CurrencyPills';
import { IntegerInput } from '@/components/tools/IntegerInput';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import { ToolCard, ToolField, ToolHighlightCard, ToolPill, toolScreenStyles } from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { spacing } from '@/lib/design/spacing';
import { formatListingPrice } from '@/lib/format';
import { buildRenovationReportHtml } from '@/lib/tools/instrumentReports';
import { calculateRenovation } from '@/lib/tools/renovation';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { RENOVATION_LEVELS, type RenovationLevel } from '@/lib/tools/renovationRates';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

export default function RenovationScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { usdRate } = useListingsCache();
  const [displayCurrency, setDisplayCurrency] = useState<PriceCurrency>('UZS');

  const formatPrice = useCallback(
    (priceUzs: number) => formatListingPrice(priceUzs, displayCurrency, usdRate),
    [displayCurrency, usdRate],
  );

  const [areaM2, setAreaM2] = useState(0);
  const [level, setLevel] = useState<RenovationLevel>('basic');
  const [includeFurniture, setIncludeFurniture] = useState(false);

  const result = useMemo(
    () => calculateRenovation({ areaM2, level, includeFurniture }),
    [areaM2, level, includeFurniture],
  );

  const levelLabel = useCallback(
    (value: RenovationLevel) => {
      const key = `tools.renovation.level${value.charAt(0).toUpperCase()}${value.slice(1)}` as const;
      return t(key);
    },
    [t],
  );

  const itemLabel = useCallback(
    (key: string) => t(`tools.renovation.items.${key}` as const),
    [t],
  );

  const itemNote = useCallback(
    (item: { noteKey: string; noteParams?: Record<string, string | number> }) =>
      t(`tools.renovation.itemNotes.${item.noteKey}` as const, item.noteParams ?? {}),
    [t],
  );

  const buildReportHtml = useCallback(
    () =>
      buildRenovationReportHtml({
        labels: {
          title: t('tools.renovation.title'),
          tagline: t('tools.export.reportTagline'),
          generated: t('tools.export.reportGenerated'),
          footer: t('tools.export.reportFooter'),
          area: t('tools.renovation.area'),
          level: t('tools.renovation.level'),
          ratePerM2: t('tools.renovation.ratePerM2'),
          total: t('tools.renovation.total'),
          disclaimer: t('tools.renovation.disclaimer'),
          materials: t('tools.renovation.items.materials'),
          labor: t('tools.renovation.items.labor'),
          contingency: t('tools.renovation.items.contingency'),
          furniture: t('tools.renovation.items.furniture'),
        includeFurniture: t('tools.renovation.furniture'),
        yes: t('common.yes'),
        no: t('common.no'),
      },
      areaM2,
      levelLabel: levelLabel(level),
      includeFurniture,
      formatPrice,
      result,
      itemLabel,
      itemNote,
    }),
    [t, areaM2, level, includeFurniture, levelLabel, formatPrice, result, itemLabel, itemNote, displayCurrency],
  );

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.currencyRow}>
        <CurrencyPills value={displayCurrency} onChange={setDisplayCurrency} />
      </View>

      <ToolCard>
        <ToolField label={t('tools.renovation.area')}>
          <IntegerInput value={areaM2} onChangeValue={setAreaM2} suffix="m²" />
        </ToolField>

        <ToolField label={t('tools.renovation.level')}>
          <View style={toolScreenStyles.pills}>
            {RENOVATION_LEVELS.map((value) => (
              <ToolPill
                key={value}
                label={levelLabel(value)}
                active={level === value}
                onPress={() => setLevel(value)}
              />
            ))}
          </View>
          <AppText variant="caption" color="secondary">
            {t(`tools.renovation.levelDesc${level.charAt(0).toUpperCase()}${level.slice(1)}` as const)}
          </AppText>
        </ToolField>

        <View style={toolScreenStyles.switchRow}>
          <AppText variant="body">{t('tools.renovation.furniture')}</AppText>
          <Switch
            value={includeFurniture}
            onValueChange={setIncludeFurniture}
            trackColor={{ true: theme.colors.accent }}
          />
        </View>
      </ToolCard>

      {areaM2 > 0 ? (
        <>
          <ToolHighlightCard>
            <AppText variant="caption" color="secondary" style={styles.rateLabel}>
              {t('tools.renovation.ratePerM2')}
            </AppText>
            <AppText variant="body">{formatPrice(result.ratePerM2)}/m²</AppText>
            <AppText variant="caption" color="secondary" style={toolScreenStyles.totalLabel}>
              {t('tools.renovation.total')}
            </AppText>
            <AppText variant="h1" color="accent" style={toolScreenStyles.headline}>
              {formatPrice(result.total)}
            </AppText>
          </ToolHighlightCard>

          <ToolCard style={styles.breakdownCard}>
            {result.items.map((item) => (
              <View key={item.key} style={toolScreenStyles.itemRow}>
                <View style={toolScreenStyles.itemLeft}>
                  <AppText variant="body">{itemLabel(item.key)}</AppText>
                  <AppText variant="caption" color="secondary">
                    {itemNote(item)}
                  </AppText>
                </View>
                <AppText variant="body">{formatPrice(item.amount)}</AppText>
              </View>
            ))}
          </ToolCard>

          <AppText variant="caption" color="tertiary" style={toolScreenStyles.disclaimer}>
            {t('tools.renovation.disclaimer')}
          </AppText>

          <ToolReportExport
            visible={result.total > 0}
            title={t('tools.renovation.title')}
            buildHtml={buildReportHtml}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  currencyRow: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  rateLabel: { letterSpacing: 0.4, textTransform: 'uppercase' },
  breakdownCard: { marginBottom: spacing.sm },
});
