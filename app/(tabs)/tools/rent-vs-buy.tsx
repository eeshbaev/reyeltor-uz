import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { CurrencyPills } from '@/components/tools/CurrencyPills';
import { MoneyInput } from '@/components/tools/MoneyInput';
import { PercentInput } from '@/components/tools/PercentInput';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import {
  ToolBanner,
  ToolCard,
  ToolField,
  ToolPill,
  ToolReadOnlyBox,
  ToolResultLine,
  ToolSummaryBox,
  toolScreenStyles,
} from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { usdToUzs, uzsToUsd } from '@/lib/exchange/cbuRate';
import { formatListingPrice } from '@/lib/format';
import { buildRentVsBuyReportHtml } from '@/lib/tools/instrumentReports';
import {
  calculateRentVsBuy,
  getTashkentAnnualAppreciation,
  getUzbekistanAnnualRentIncrease,
} from '@/lib/tools/rentVsBuy';
import { useMarketDataVersion } from '@/lib/hooks/useMarketData';
import { formatDecimalInput } from '@/lib/tools/parseNumeric';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

const TERM_PRESETS = [5, 10, 15, 20, 25, 30];

export default function RentVsBuyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { usdRate } = useListingsCache();
  useMarketDataVersion();

  const annualAppreciation = getTashkentAnnualAppreciation();
  const annualRentIncrease = getUzbekistanAnnualRentIncrease();

  const [monthlyRent, setMonthlyRent] = useState(0);
  const [rentCurrency, setRentCurrency] = useState<PriceCurrency>('UZS');
  const [propertyPrice, setPropertyPrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [annualLoanRate, setAnnualLoanRate] = useState(24);
  const [termYears, setTermYears] = useState(20);
  const [yearsToStay, setYearsToStay] = useState(7);
  const [showAllYears, setShowAllYears] = useState(false);

  const formatUzs = useCallback(
    (amountUzs: number) => formatListingPrice(amountUzs, 'UZS', usdRate),
    [usdRate],
  );

  const monthlyRentUzs = useMemo(() => {
    if (monthlyRent <= 0) return 0;
    return rentCurrency === 'USD' ? usdToUzs(monthlyRent, usdRate) : monthlyRent;
  }, [monthlyRent, rentCurrency, usdRate]);

  const handleRentCurrencyChange = useCallback(
    (next: PriceCurrency) => {
      if (next === rentCurrency) return;
      if (monthlyRent > 0) {
        setMonthlyRent(
          next === 'USD'
            ? Math.round(uzsToUsd(monthlyRent, usdRate) * 100) / 100
            : usdToUzs(monthlyRent, usdRate),
        );
      }
      setRentCurrency(next);
    },
    [monthlyRent, rentCurrency, usdRate],
  );

  const result = useMemo(
    () =>
      calculateRentVsBuy({
        monthlyRent: monthlyRentUzs,
        propertyPrice,
        downPayment,
        annualLoanRate,
        termYears,
        annualAppreciation,
        annualRentIncrease,
        yearsToStay,
      }),
    [monthlyRentUzs, propertyPrice, downPayment, annualLoanRate, termYears, yearsToStay, annualAppreciation, annualRentIncrease],
  );

  const visibleYears = showAllYears ? result.yearlyData : result.yearlyData.slice(0, 5);

  const bannerStyle =
    result.recommendation === 'buy'
      ? { backgroundColor: theme.colors.successSurface, color: theme.colors.success }
      : result.recommendation === 'rent'
        ? { backgroundColor: theme.colors.accentSurface, color: theme.colors.accent }
        : { backgroundColor: theme.colors.surface, color: theme.colors.secondary };

  const bannerText =
    result.recommendation === 'buy'
      ? t('tools.rentVsBuy.buyingSmarter', { years: result.breakEvenYear > 0 ? result.breakEvenYear : yearsToStay })
      : result.recommendation === 'rent'
        ? t('tools.rentVsBuy.rentingSmarter')
        : t('tools.rentVsBuy.neutral');

  const monthlyRentDisplay = useMemo(() => {
    if (monthlyRent <= 0) return '—';
    if (rentCurrency === 'USD') {
      return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(monthlyRent)}`;
    }
    return formatUzs(monthlyRent);
  }, [monthlyRent, rentCurrency, formatUzs]);

  const buildReportHtml = useCallback(
    () =>
      buildRentVsBuyReportHtml({
        labels: {
          title: t('tools.rentVsBuy.title'),
          tagline: t('tools.export.reportTagline'),
          generated: t('tools.export.reportGenerated'),
          footer: t('tools.export.reportFooter'),
          monthlyRent: t('tools.rentVsBuy.monthlyRent'),
          price: t('tools.mortgage.price'),
          downPayment: t('tools.mortgage.downPayment'),
          rate: t('tools.mortgage.rate'),
          term: t('tools.mortgage.term'),
          appreciation: t('tools.rentVsBuy.appreciation'),
          rentIncrease: t('tools.rentVsBuy.rentIncrease'),
          yearsToStay: t('tools.rentVsBuy.yearsToStay'),
          recommendation: t('tools.rentVsBuy.title'),
          totalRentCost: t('tools.rentVsBuy.totalRentCost'),
          netBuyCost: t('tools.rentVsBuy.netBuyCost'),
          propertyValue: t('tools.rentVsBuy.propertyValue'),
          equityBuilt: t('tools.rentVsBuy.equityBuilt'),
          year: t('tools.rentVsBuy.year'),
          difference: t('tools.rentVsBuy.difference'),
          yearlyBreakdown: t('tools.rentVsBuy.yearlyBreakdown'),
          atExit: t('tools.rentVsBuy.atExit'),
          resultsInUzs: t('tools.rentVsBuy.resultsInUzs'),
        },
        monthlyRentDisplay,
        propertyPrice,
        downPayment,
        annualLoanRate,
        termYears,
        appreciation: annualAppreciation,
        rentIncrease: annualRentIncrease,
        yearsToStay,
        recommendationText: bannerText,
        formatUzs,
        result,
      }),
    [
      t,
      monthlyRentDisplay,
      propertyPrice,
      downPayment,
      annualLoanRate,
      termYears,
      yearsToStay,
      bannerText,
      annualAppreciation,
      annualRentIncrease,
      formatUzs,
      result,
    ],
  );

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
    >
      <ToolCard>
        <ToolField label={t('tools.rentVsBuy.monthlyRent')}>
          <CurrencyPills value={rentCurrency} onChange={handleRentCurrencyChange} />
          {rentCurrency === 'UZS' ? (
            <MoneyInput value={monthlyRent} onChangeValue={setMonthlyRent} suffix="UZS" />
          ) : (
            <MoneyInput value={monthlyRent} onChangeValue={setMonthlyRent} suffix="USD" decimals={2} />
          )}
          <AppText variant="caption" color="secondary">
            {t('filters.cbuRate', { rate: usdRate.toLocaleString('uz-UZ') })}
          </AppText>
          {rentCurrency === 'USD' && monthlyRent > 0 ? (
            <AppText variant="caption" color="secondary">
              {t('tools.rentVsBuy.rentConverted', { amount: formatUzs(monthlyRentUzs) })}
            </AppText>
          ) : null}
        </ToolField>
        <ToolField label={t('tools.mortgage.price')}>
          <MoneyInput value={propertyPrice} onChangeValue={setPropertyPrice} suffix="UZS" />
        </ToolField>
        <ToolField label={t('tools.mortgage.downPayment')}>
          <MoneyInput value={downPayment} onChangeValue={setDownPayment} suffix="UZS" />
          <AppText variant="caption" color="secondary">
            {t('tools.rentVsBuy.loanInUzs')}
          </AppText>
        </ToolField>
        <ToolField label={t('tools.mortgage.rate')}>
          <PercentInput value={annualLoanRate} onChangeValue={setAnnualLoanRate} placeholder="24" />
        </ToolField>
        <ToolField label={t('tools.mortgage.term')}>
          <View style={toolScreenStyles.pills}>
            {TERM_PRESETS.map((y) => (
              <ToolPill key={y} label={`${y}y`} active={termYears === y} onPress={() => setTermYears(y)} />
            ))}
          </View>
        </ToolField>
        <ToolField label={t('tools.rentVsBuy.appreciation')}>
          <ToolReadOnlyBox>
            <AppText variant="body">{formatDecimalInput(annualAppreciation)}</AppText>
            <AppText variant="caption" color="secondary">
              %
            </AppText>
          </ToolReadOnlyBox>
          <AppText variant="caption" color="secondary">{t('tools.rentVsBuy.appreciationNote')}</AppText>
        </ToolField>
        <ToolField label={t('tools.rentVsBuy.rentIncrease')}>
          <ToolReadOnlyBox>
            <AppText variant="body">{formatDecimalInput(annualRentIncrease)}</AppText>
            <AppText variant="caption" color="secondary">
              %
            </AppText>
          </ToolReadOnlyBox>
          <AppText variant="caption" color="secondary">{t('tools.rentVsBuy.rentIncreaseNote')}</AppText>
        </ToolField>
        <ToolField label={t('tools.rentVsBuy.yearsToStay')}>
          <View style={toolScreenStyles.pills}>
            {[3, 5, 7, 10, 15, 20, 30].map((y) => (
              <ToolPill key={y} label={`${y}y`} active={yearsToStay === y} onPress={() => setYearsToStay(y)} />
            ))}
          </View>
        </ToolField>
      </ToolCard>

      {propertyPrice > 0 && monthlyRentUzs > 0 ? (
        <>
          <AppText variant="caption" color="secondary" style={toolScreenStyles.resultsNote}>
            {t('tools.rentVsBuy.resultsInUzs')}
          </AppText>
          <ToolBanner backgroundColor={bannerStyle.backgroundColor} textColor={bannerStyle.color}>
            {bannerText}
          </ToolBanner>

          <View style={toolScreenStyles.summaryRow}>
            <ToolSummaryBox label={t('tools.rentVsBuy.totalRentCost')} value={formatUzs(result.totalRentCost)} />
            <ToolSummaryBox label={t('tools.rentVsBuy.netBuyCost')} value={formatUzs(result.netBuyCost)} />
          </View>

          <AppText variant="h3" style={toolScreenStyles.sectionTitle}>{t('tools.rentVsBuy.yearlyBreakdown')}</AppText>
          <ToolCard>
            <View style={toolScreenStyles.tableHeader}>
              <AppText variant="micro" color="secondary" style={toolScreenStyles.colYear}>{t('tools.rentVsBuy.year')}</AppText>
              <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>{t('tools.rentVsBuy.totalRentCost')}</AppText>
              <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>{t('tools.rentVsBuy.netBuyCost')}</AppText>
              <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>{t('tools.rentVsBuy.difference')}</AppText>
            </View>
            {visibleYears.map((row) => {
              const diff = row.cumulativeRentCost - row.netCostToBuy;
              return (
                <View key={row.year} style={toolScreenStyles.tableRow}>
                  <AppText variant="caption" style={toolScreenStyles.colYear}>{row.year}</AppText>
                  <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>{formatUzs(row.cumulativeRentCost)}</AppText>
                  <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>{formatUzs(row.netCostToBuy)}</AppText>
                  <AppText variant="caption" style={toolScreenStyles.col} color={diff >= 0 ? 'success' : 'danger'} numberOfLines={1}>
                    {formatUzs(Math.abs(diff))}
                  </AppText>
                </View>
              );
            })}
            {result.yearlyData.length > 5 ? (
              <Pressable onPress={() => setShowAllYears(!showAllYears)} style={toolScreenStyles.showAll}>
                <AppText variant="label" color="accent">{showAllYears ? t('common.showLess') : t('common.showMore')}</AppText>
              </Pressable>
            ) : null}
          </ToolCard>

          <ToolCard>
            <AppText variant="label" color="secondary">{t('tools.rentVsBuy.atExit')}</AppText>
            <ToolResultLine label={t('tools.rentVsBuy.propertyValue')} value={formatUzs(result.propertyValueAtExit)} />
            <ToolResultLine label={t('tools.rentVsBuy.equityBuilt')} value={formatUzs(result.equityBuilt)} />
          </ToolCard>

          <ToolReportExport
            visible
            title={t('tools.rentVsBuy.title')}
            buildHtml={buildReportHtml}
          />
        </>
      ) : null}
    </ScrollView>
  );
}
