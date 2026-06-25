import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { CurrencyPills } from '@/components/tools/CurrencyPills';
import { DistrictTrendChart } from '@/components/tools/DistrictTrendChart';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import { ToolCard, ToolPill, toolScreenStyles } from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { toolPickerStyle, toolScreenBackground, toolSelectorStyle } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { useDistrictTwelveMonthTrend } from '@/lib/hooks/useDistrictTrend';
import { buildDistrictComparisonReportHtml } from '@/lib/tools/instrumentReports';
import {
  formatMarketPerSqm,
  getCommercialDistrictMarketAverages,
  getDistrictMarketAverages,
} from '@/lib/market/tashkentDistrictMarket';
import { DEFAULT_RESIDENTIAL_DISTRICT_MARKET } from '@/lib/market/defaultMarketData';
import type { DistrictTrendPoint } from '@/lib/market/districtPriceHistory';
import { useMarketDataVersion } from '@/lib/hooks/useMarketData';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

const DISTRICTS = Object.keys(DEFAULT_RESIDENTIAL_DISTRICT_MARKET);

export default function DistrictComparisonScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { usdRate } = useListingsCache();
  const [displayCurrency, setDisplayCurrency] = useState<PriceCurrency>('UZS');
  useMarketDataVersion();

  const [districtA, setDistrictA] = useState('Yunusobod');
  const [districtB, setDistrictB] = useState('Chilanzar');
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const [pickerOpen, setPickerOpen] = useState<'a' | 'b' | null>(null);

  const dataA = useMemo(() => getDistrictData(districtA, category), [districtA, category]);
  const dataB = useMemo(() => getDistrictData(districtB, category), [districtB, category]);
  const trendA = useDistrictTwelveMonthTrend(districtA, category);
  const trendB = useDistrictTwelveMonthTrend(districtB, category);

  const summary = useMemo(() => {
    if (!dataA || !dataB) return null;
    const saleA = dataA.sale;
    const saleB = dataB.sale;
    if (saleA === saleB) return t('tools.districtComparison.equalPrices', { districtA, districtB });
    const higher = saleA > saleB ? districtA : districtB;
    const lower = saleA > saleB ? districtB : districtA;
    const pct = Math.round((Math.abs(saleA - saleB) / Math.min(saleA, saleB)) * 100);
    return t('tools.districtComparison.priceDiff', { higher, lower, percent: pct });
  }, [dataA, dataB, districtA, districtB, t]);

  const formatVal = useCallback(
    (usd: number) => formatMarketPerSqm(usd, displayCurrency, usdRate),
    [displayCurrency, usdRate],
  );

  const rentLabel =
    category === 'residential' ? t('tools.districtComparison.avgRent') : t('tools.districtComparison.avgLease');
  const saleLabel = t('tools.districtComparison.avgSale');

  const buildReportHtml = useCallback(() => {
    if (!dataA || !dataB || !summary) {
      return Promise.resolve('');
    }
    return buildDistrictComparisonReportHtml({
      labels: {
        title: t('tools.districtComparison.title'),
        tagline: t('tools.export.reportTagline'),
        generated: t('tools.export.reportGenerated'),
        footer: t('tools.export.reportFooter'),
        districtA: t('tools.districtComparison.districtA'),
        districtB: t('tools.districtComparison.districtB'),
        category: t('tools.districtComparison.category'),
        residential: t('tools.districtComparison.residential'),
        commercial: t('tools.districtComparison.commercial'),
        avgRent: t('tools.districtComparison.avgRent'),
        avgSale: t('tools.districtComparison.avgSale'),
        avgLease: t('tools.districtComparison.avgLease'),
        summary: t('tools.districtComparison.title'),
      },
      districtA,
      districtB,
      category,
      rentLabel,
      rentA: formatVal(dataA.rent),
      rentB: formatVal(dataB.rent),
      saleA: formatVal(dataA.sale),
      saleB: formatVal(dataB.sale),
      summary,
    });
  }, [dataA, dataB, summary, t, districtA, districtB, category, rentLabel, formatVal]);

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
    >
      <View style={styles.topBar}>
        <View style={styles.categoryPills}>
          <ToolPill label={t('tools.districtComparison.residential')} active={category === 'residential'} onPress={() => setCategory('residential')} />
          <ToolPill label={t('tools.districtComparison.commercial')} active={category === 'commercial'} onPress={() => setCategory('commercial')} />
        </View>
        <CurrencyPills value={displayCurrency} onChange={setDisplayCurrency} />
      </View>

      <View style={toolScreenStyles.selectors}>
        <DistrictSelector label={t('tools.districtComparison.districtA')} district={districtA} onPress={() => setPickerOpen('a')} />
        <DistrictSelector label={t('tools.districtComparison.districtB')} district={districtB} onPress={() => setPickerOpen('b')} />
      </View>

      {pickerOpen ? (
        <View style={toolPickerStyle(theme)}>
          {DISTRICTS.map((d) => (
            <Pressable
              key={d}
              onPress={() => {
                if (pickerOpen === 'a') setDistrictA(d);
                else setDistrictB(d);
                setPickerOpen(null);
              }}
              style={toolScreenStyles.pickerItem}
            >
              <AppText variant="body">{d}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {dataA && dataB ? (
        <ToolCard>
          <View style={toolScreenStyles.tableHeader}>
            <AppText variant="micro" color="secondary" style={toolScreenStyles.metricCol} />
            <AppText variant="label" style={toolScreenStyles.col}>{districtA}</AppText>
            <AppText variant="label" style={toolScreenStyles.col}>{districtB}</AppText>
          </View>

          <CompareRow
            label={category === 'residential' ? t('tools.districtComparison.avgRent') : t('tools.districtComparison.avgLease')}
            valueA={formatVal(dataA.rent)}
            valueB={formatVal(dataB.rent)}
            numA={dataA.rent}
            numB={dataB.rent}
          />
          <CompareRow
            label={t('tools.districtComparison.avgSale')}
            valueA={formatVal(dataA.sale)}
            valueB={formatVal(dataB.sale)}
            numA={dataA.sale}
            numB={dataB.sale}
          />

          {summary ? (
            <AppText variant="body" color="accent" style={styles.summary}>
              {summary}
            </AppText>
          ) : null}
        </ToolCard>
      ) : null}

      {dataA && dataB ? (
        <>
          <DistrictTrendDashboard
            district={districtA}
            trend={trendA}
            rentLabel={rentLabel}
            saleLabel={saleLabel}
            formatRent={(value) => formatVal(value)}
            formatSale={(value) => formatVal(value)}
          />
          <DistrictTrendDashboard
            district={districtB}
            trend={trendB}
            rentLabel={rentLabel}
            saleLabel={saleLabel}
            formatRent={(value) => formatVal(value)}
            formatSale={(value) => formatVal(value)}
          />
        </>
      ) : null}

      <ToolReportExport
        visible={Boolean(dataA && dataB && summary)}
        title={t('tools.districtComparison.title')}
        buildHtml={buildReportHtml}
      />
    </ScrollView>
  );
}

function getDistrictData(district: string, category: 'residential' | 'commercial') {
  if (category === 'residential') {
    const data = getDistrictMarketAverages(district);
    if (!data) return null;
    return { rent: data.rentPerSqmUsd, sale: data.salePerSqmUsd };
  }
  const data = getCommercialDistrictMarketAverages(district);
  if (!data) return null;
  return { rent: data.leasePerSqmUsd, sale: data.salePerSqmUsd };
}

function DistrictSelector({ label, district, onPress }: { label: string; district: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={toolSelectorStyle(theme)}>
      <AppText variant="caption" color="secondary">{label}</AppText>
      <AppText variant="label">{district}</AppText>
    </Pressable>
  );
}

function DistrictTrendDashboard({
  district,
  trend,
  rentLabel,
  saleLabel,
  formatRent,
  formatSale,
}: {
  district: string;
  trend: DistrictTrendPoint[];
  rentLabel: string;
  saleLabel: string;
  formatRent: (value: number) => string;
  formatSale: (value: number) => string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const rentChange = trendPctChange(trend, 'rent');
  const saleChange = trendPctChange(trend, 'sale');

  return (
    <ToolCard style={styles.trendCard}>
      <View style={toolScreenStyles.chartHeader}>
        <AppText variant="h3">{t('tools.districtComparison.trendTitle', { district })}</AppText>
        <AppText variant="caption" color="secondary">{t('tools.districtComparison.last12Months')}</AppText>
      </View>

      {rentChange !== null || saleChange !== null ? (
        <View style={styles.trendStats}>
          {rentChange !== null ? (
            <AppText variant="caption" color={rentChange >= 0 ? 'danger' : 'success'}>
              {t('tools.districtComparison.trendRentChange', { pct: formatPct(rentChange) })}
            </AppText>
          ) : null}
          {saleChange !== null ? (
            <AppText variant="caption" color={saleChange >= 0 ? 'danger' : 'success'}>
              {t('tools.districtComparison.trendSaleChange', { pct: formatPct(saleChange) })}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <DistrictTrendChart
        data={trend}
        rentColor={theme.colors.accent}
        saleColor={theme.colors.warning}
        gridColor={theme.colors.border}
        labelColor={theme.colors.secondary}
        formatRent={formatRent}
        formatSale={formatSale}
        rentLabel={rentLabel}
        saleLabel={saleLabel}
      />

      <AppText variant="micro" color="tertiary" style={styles.trendNote}>
        {t('tools.districtComparison.trendNote')}
      </AppText>
    </ToolCard>
  );
}

function trendPctChange(trend: DistrictTrendPoint[], key: 'rent' | 'sale'): number | null {
  if (trend.length < 2) return null;
  const first = trend[0][key];
  const last = trend[trend.length - 1][key];
  if (!first) return null;
  return Math.round(((last - first) / first) * 100);
}

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function CompareRow({
  label,
  valueA,
  valueB,
  numA,
  numB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  numA: number;
  numB: number;
}) {
  const tie = numA === numB;
  const aHigher = numA > numB;
  const bHigher = numB > numA;

  return (
    <View style={toolScreenStyles.compareRow}>
      <AppText variant="caption" color="secondary" style={toolScreenStyles.metricCol}>{label}</AppText>
      <AppText variant="body" style={toolScreenStyles.col} color={tie ? 'primary' : aHigher ? 'danger' : 'primary'}>{valueA}</AppText>
      <AppText variant="body" style={toolScreenStyles.col} color={tie ? 'primary' : bHigher ? 'danger' : 'primary'}>{valueB}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryPills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summary: { marginTop: spacing.md },
  trendCard: { marginTop: spacing.md },
  trendStats: { gap: spacing.xs, marginBottom: spacing.sm },
  trendNote: { marginTop: spacing.sm },
});
