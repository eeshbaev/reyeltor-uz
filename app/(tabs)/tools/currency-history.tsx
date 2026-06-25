import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { CurrencyRateChart } from '@/components/tools/CurrencyRateChart';
import { MoneyInput } from '@/components/tools/MoneyInput';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import {
  ToolCard,
  ToolHighlightCard,
  ToolMetricCard,
  ToolPill,
  toolScreenStyles,
} from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { computeRateStats, filterPointsByMonths, formatRateDateFull, CURRENCY_HISTORY_PERIODS, type CurrencyHistoryMonths } from '@/lib/exchange/cbuRateHistory';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { formatListingPrice } from '@/lib/format';
import { useCbuRateHistory } from '@/lib/hooks/useCbuRateHistory';
import { buildCurrencyHistoryReportHtml } from '@/lib/tools/instrumentReports';
import { getPropertyPriceInPastRates } from '@/lib/tools/currencyHistory';
import { useTheme } from '@/lib/theme';

export default function CurrencyHistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { usdRate } = useListingsCache();
  const { points, loading, refreshing, updatedAt, fromCache, refresh } = useCbuRateHistory();

  const [priceUsd, setPriceUsd] = useState(50_000);
  const [analysisMonths, setAnalysisMonths] = useState<CurrencyHistoryMonths>(12);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh]),
  );

  const periodPoints = useMemo(
    () => filterPointsByMonths(points, analysisMonths),
    [points, analysisMonths],
  );

  const periodLabel = t(`tools.currencyHistory.periodLabels.${analysisMonths}`);

  const stats = useMemo(() => computeRateStats(periodPoints), [periodPoints]);
  const displayRate = stats?.current ?? usdRate;
  const history = useMemo(() => getPropertyPriceInPastRates(priceUsd, periodPoints), [priceUsd, periodPoints]);

  const formatUzs = useCallback(
    (value: number) => formatListingPrice(value, 'UZS', usdRate),
    [usdRate],
  );

  const formatRate = useCallback(
    (value: number) => `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 2 }).format(value)} UZS`,
    [],
  );

  const buildReportHtml = useCallback(
    () =>
      buildCurrencyHistoryReportHtml({
        labels: {
          title: t('tools.currencyHistory.title'),
          tagline: t('tools.export.reportTagline'),
          generated: t('tools.export.reportGenerated'),
          footer: t('tools.export.reportFooter'),
          currentRate: t('tools.currencyHistory.currentRate'),
          propertyPriceUsd: t('tools.currencyHistory.propertyPriceUsd'),
          period: t('tools.currencyHistory.period'),
          rate: t('tools.currencyHistory.rate'),
          priceUzs: t('tools.currencyHistory.priceUzs'),
          source: t('tools.currencyHistory.source'),
        },
        usdRate: displayRate,
        priceUsd,
        history,
        formatUzs,
      }),
    [t, displayRate, priceUsd, history, formatUzs, periodLabel],
  );

  const updatedLabel = updatedAt
    ? t('tools.currencyHistory.lastUpdated', {
        date: new Date(updatedAt).toLocaleString(),
      })
    : fromCache
      ? t('tools.currencyHistory.offlineCached')
      : null;

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
    >
      <ToolHighlightCard style={{ alignItems: 'center', backgroundColor: theme.colors.accentSurface }}>
        <AppText variant="caption" color="secondary" style={toolScreenStyles.headlineLabel}>
          {t('tools.currencyHistory.currentRate')}
        </AppText>
        <AppText variant="h1" color="accent" style={styles.rateValue}>
          {formatRate(displayRate)}
        </AppText>
        {stats ? (
          <AppText variant="caption" color="secondary">
            CBU · {formatRateDateFull(stats.currentDate)}
          </AppText>
        ) : null}
        {updatedLabel ? (
          <AppText variant="micro" color="tertiary" style={styles.updated}>
            {updatedLabel}
          </AppText>
        ) : null}
      </ToolHighlightCard>

      {stats ? (
        <View style={toolScreenStyles.statsRow}>
          <ToolMetricCard
            style={toolScreenStyles.statCard}
            label={t('tools.currencyHistory.changePeriod', { period: periodLabel })}
            value={`${stats.changePct >= 0 ? '+' : ''}${stats.changePct.toFixed(1)}%`}
            danger={stats.changePct >= 0}
            success={stats.changePct < 0}
          />
          <ToolMetricCard
            style={toolScreenStyles.statCard}
            label={t('tools.currencyHistory.periodLow', { period: periodLabel })}
            value={formatRate(stats.min)}
          />
          <ToolMetricCard
            style={toolScreenStyles.statCard}
            label={t('tools.currencyHistory.periodHigh', { period: periodLabel })}
            value={formatRate(stats.max)}
          />
        </View>
      ) : null}

      <View style={styles.periodRow}>
        {CURRENCY_HISTORY_PERIODS.map((months) => (
          <ToolPill
            key={months}
            label={t(`tools.currencyHistory.periodLabels.${months}`)}
            active={analysisMonths === months}
            onPress={() => setAnalysisMonths(months)}
          />
        ))}
      </View>

      <ToolCard>
        <View style={toolScreenStyles.chartHeader}>
          <AppText variant="h3">{t('tools.currencyHistory.chartTitle', { period: periodLabel })}</AppText>
          {refreshing ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        </View>
        {loading && points.length < 2 ? (
          <View style={toolScreenStyles.loading}>
            <ActivityIndicator color={theme.colors.accent} />
            <AppText variant="caption" color="secondary">
              {t('tools.currencyHistory.syncing')}
            </AppText>
          </View>
        ) : (
          <CurrencyRateChart
            data={periodPoints}
            accentColor={theme.colors.accent}
            gridColor={theme.colors.border}
            labelColor={theme.colors.textSecondary}
          />
        )}
        <Pressable onPress={() => refresh(true)} style={toolScreenStyles.refreshBtn}>
          <AppText variant="caption" color="accent">
            {t('tools.currencyHistory.refresh')}
          </AppText>
        </Pressable>
      </ToolCard>

      <ToolCard>
        <AppText variant="label" color="secondary">
          {t('tools.currencyHistory.propertyPriceUsd')}
        </AppText>
        <MoneyInput value={priceUsd} onChangeValue={setPriceUsd} suffix="USD" placeholder="50 000" />
        {priceUsd > 0 && history.length ? (
          <View style={toolScreenStyles.propertySummary}>
            <SummaryLine
              label={t('tools.currencyHistory.priceNow')}
              value={formatUzs(history[history.length - 1].priceUzs)}
            />
            <SummaryLine
              label={t('tools.currencyHistory.priceAtStart')}
              value={formatUzs(history[0].priceUzs)}
            />
          </View>
        ) : null}
      </ToolCard>

      <AppText variant="caption" color="tertiary" style={toolScreenStyles.disclaimer}>
        {t('tools.currencyHistory.source')}
      </AppText>

      <ToolReportExport
        visible={priceUsd > 0 && history.length > 0}
        title={t('tools.currencyHistory.title')}
        buildHtml={buildReportHtml}
      />
    </ScrollView>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={toolScreenStyles.summaryLine}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  rateValue: { letterSpacing: -0.5 },
  updated: { marginTop: spacing.xs },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
