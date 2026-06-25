import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { MoneyInput } from '@/components/tools/MoneyInput';
import { PercentInput } from '@/components/tools/PercentInput';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import {
  ToolCard,
  ToolField,
  ToolHighlightCard,
  ToolPill,
  ToolResultLine,
  toolScreenStyles,
} from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { formatListingPrice } from '@/lib/format';
import { calculateAffordability } from '@/lib/tools/affordability';
import { buildAffordabilityReportHtml } from '@/lib/tools/instrumentReports';
import { useTheme } from '@/lib/theme';

const TERM_PRESETS = [5, 10, 15, 20, 25, 30];

export default function AffordabilityScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { usdRate } = useListingsCache();

  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyLivingExpenses, setMonthlyLivingExpenses] = useState(0);
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState(0);
  const [savedDownPayment, setSavedDownPayment] = useState(0);
  const [targetPropertyPrice, setTargetPropertyPrice] = useState(0);
  const [annualRate, setAnnualRate] = useState(24);
  const [termYears, setTermYears] = useState(20);
  const [monthlySavings, setMonthlySavings] = useState(0);

  const formatUzs = useCallback(
    (value: number) => formatListingPrice(value, 'UZS', usdRate),
    [usdRate],
  );

  const result = useMemo(
    () =>
      calculateAffordability({
        monthlyIncome,
        monthlyLivingExpenses,
        monthlyDebtPayments,
        savedDownPayment,
        annualRate,
        termYears,
        monthlySavings,
        targetPropertyPrice,
      }),
    [monthlyIncome, monthlyLivingExpenses, monthlyDebtPayments, savedDownPayment, annualRate, termYears, monthlySavings, targetPropertyPrice],
  );

  const formatMonths = (months: number) => {
    if (months === Infinity || !Number.isFinite(months)) return '—';
    if (months <= 0) return t('tools.affordability.readyNow');
    return t('tools.affordability.months', { count: months });
  };

  const headlineLabel = result.incomeLimited
    ? t('tools.affordability.cashOnlyAfford')
    : t('tools.affordability.canAfford');

  const headlineValue = result.incomeLimited ? savedDownPayment : result.maxPropertyPrice;

  const buildReportHtml = useCallback(
    () =>
      buildAffordabilityReportHtml({
        labels: {
          title: t('tools.affordability.title'),
          tagline: t('tools.export.reportTagline'),
          generated: t('tools.export.reportGenerated'),
          footer: t('tools.export.reportFooter'),
          monthlyIncome: t('tools.affordability.monthlyIncome'),
          monthlyLivingExpenses: t('tools.affordability.monthlyLivingExpenses'),
          monthlyDebtPayments: t('tools.affordability.monthlyDebtPayments'),
          currentSavings: t('tools.affordability.currentSavings'),
          targetPrice: t('tools.affordability.targetPrice'),
          rate: t('tools.mortgage.rate'),
          term: t('tools.mortgage.term'),
          monthlySavings: t('tools.affordability.monthlySavings'),
          canAfford: headlineLabel,
          maxPayment: t('tools.affordability.maxPayment'),
          maxLoan: t('tools.affordability.maxLoan'),
          incomeLimitedNote: t('tools.affordability.incomeLimitedNote'),
          targetProperty: t('tools.affordability.targetProperty'),
          requiredDown: t('tools.affordability.requiredDown', { percent: '{{percent}}' }),
          requiredPayment: t('tools.affordability.requiredPayment'),
          downShortfall: t('tools.affordability.downShortfall'),
          affordable: t('tools.affordability.affordable'),
          notAffordable: t('tools.affordability.notAffordable'),
          savingsTimeline: t('tools.affordability.savingsTimeline'),
          downPercent10: t('tools.affordability.downPercent10'),
          downPercent20: t('tools.affordability.downPercent20'),
          downPercent30: t('tools.affordability.downPercent30'),
          disclaimer: t('tools.affordability.disclaimer'),
        },
        monthlyIncome,
        monthlyLivingExpenses,
        monthlyDebtPayments,
        savedDownPayment,
        targetPropertyPrice,
        annualRate,
        termYears,
        monthlySavings,
        headlineLabel,
        headlineValue,
        formatUzs,
        formatMonths,
        result,
      }),
    [
      t,
      monthlyIncome,
      monthlyLivingExpenses,
      monthlyDebtPayments,
      savedDownPayment,
      targetPropertyPrice,
      annualRate,
      termYears,
      monthlySavings,
      headlineLabel,
      headlineValue,
      formatUzs,
      formatMonths,
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
        <ToolField label={t('tools.affordability.monthlyIncome')}>
          <MoneyInput value={monthlyIncome} onChangeValue={setMonthlyIncome} suffix="UZS" />
        </ToolField>
        <ToolField label={t('tools.affordability.monthlyLivingExpenses')}>
          <MoneyInput value={monthlyLivingExpenses} onChangeValue={setMonthlyLivingExpenses} suffix="UZS" />
          <AppText variant="caption" color="secondary">
            {t('tools.affordability.monthlyLivingExpensesNote')}
          </AppText>
        </ToolField>
        <ToolField label={t('tools.affordability.monthlyDebtPayments')}>
          <MoneyInput value={monthlyDebtPayments} onChangeValue={setMonthlyDebtPayments} suffix="UZS" />
          <AppText variant="caption" color="secondary">
            {t('tools.affordability.monthlyDebtPaymentsNote')}
          </AppText>
        </ToolField>
        <ToolField label={t('tools.affordability.currentSavings')}>
          <MoneyInput value={savedDownPayment} onChangeValue={setSavedDownPayment} suffix="UZS" />
        </ToolField>
        <ToolField label={t('tools.affordability.targetPrice')}>
          <MoneyInput value={targetPropertyPrice} onChangeValue={setTargetPropertyPrice} suffix="UZS" />
          <AppText variant="caption" color="secondary">
            {t('tools.affordability.targetPriceNote')}
          </AppText>
        </ToolField>
        <ToolField label={t('tools.mortgage.rate')}>
          <PercentInput value={annualRate} onChangeValue={setAnnualRate} placeholder="24" />
        </ToolField>
        <ToolField label={t('tools.mortgage.term')}>
          <View style={toolScreenStyles.pills}>
            {TERM_PRESETS.map((years) => (
              <ToolPill key={years} label={`${years}y`} active={termYears === years} onPress={() => setTermYears(years)} />
            ))}
          </View>
        </ToolField>
        <ToolField label={t('tools.affordability.monthlySavings')}>
          <MoneyInput value={monthlySavings} onChangeValue={setMonthlySavings} suffix="UZS" />
        </ToolField>
      </ToolCard>

      {monthlyIncome > 0 ? (
        <>
          <ToolHighlightCard>
            <AppText variant="caption" color="secondary" style={toolScreenStyles.headlineLabel}>
              {headlineLabel}
            </AppText>
            <AppText variant="h1" color="accent" style={toolScreenStyles.headline}>
              {formatUzs(headlineValue)}
            </AppText>
          </ToolHighlightCard>

          {result.incomeLimited ? (
            <AppText variant="caption" color="secondary" style={toolScreenStyles.warning}>
              {result.limitingFactor === 'living'
                ? t('tools.affordability.livingLimitedNote')
                : t('tools.affordability.incomeLimitedNote')}
            </AppText>
          ) : result.limitingFactor === 'living' ? (
            <AppText variant="caption" color="secondary" style={toolScreenStyles.warning}>
              {t('tools.affordability.livingCappedNote')}
            </AppText>
          ) : null}

          <ToolCard>
            <ToolResultLine label={t('tools.affordability.maxPayment')} value={formatUzs(result.maxMonthlyPayment)} />
            <ToolResultLine label={t('tools.affordability.maxLoan')} value={formatUzs(result.maxLoanAmount)} />
          </ToolCard>

          {targetPropertyPrice > 0 ? (
            <>
              <AppText variant="h3" style={toolScreenStyles.sectionTitle}>
                {t('tools.affordability.targetProperty')}
              </AppText>
              <ToolCard>
                {result.targetScenarios.map((scenario) => (
                  <View key={scenario.downPercent} style={toolScreenStyles.scenarioBlock}>
                    <AppText variant="label">
                      {t('tools.affordability.requiredDown', { percent: scenario.downPercent })}
                    </AppText>
                    <ToolResultLine
                      label={t('tools.affordability.requiredPayment')}
                      value={formatUzs(scenario.monthlyPayment)}
                    />
                    {scenario.downPaymentShortfall > 0 ? (
                      <ToolResultLine
                        label={t('tools.affordability.downShortfall')}
                        value={formatUzs(scenario.downPaymentShortfall)}
                      />
                    ) : null}
                    <AppText variant="label" color={scenario.canAfford ? 'success' : 'danger'}>
                      {scenario.canAfford
                        ? t('tools.affordability.affordable')
                        : t('tools.affordability.notAffordable')}
                    </AppText>
                  </View>
                ))}
              </ToolCard>
            </>
          ) : null}

          {result.maxLoanAmount > 0 ? (
            <>
              <AppText variant="h3" style={toolScreenStyles.sectionTitle}>
                {t('tools.affordability.savingsTimeline')}
              </AppText>
              <ToolCard>
                <TimelineRow label={t('tools.affordability.downPercent10')} value={formatMonths(result.monthsToSaveFor10Percent)} ready={result.monthsToSaveFor10Percent <= 0} />
                <TimelineRow label={t('tools.affordability.downPercent20')} value={formatMonths(result.monthsToSaveFor20Percent)} ready={result.monthsToSaveFor20Percent <= 0} />
                <TimelineRow label={t('tools.affordability.downPercent30')} value={formatMonths(result.monthsToSaveFor30Percent)} ready={result.monthsToSaveFor30Percent <= 0} />
              </ToolCard>
            </>
          ) : null}

          <AppText variant="caption" color="tertiary" style={toolScreenStyles.disclaimer}>
            {t('tools.affordability.disclaimer')}
          </AppText>

          <ToolReportExport visible title={t('tools.affordability.title')} buildHtml={buildReportHtml} />
        </>
      ) : null}
    </ScrollView>
  );
}

function TimelineRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <View style={toolScreenStyles.timelineRow}>
      <AppText variant="body" color="secondary">{label}</AppText>
      <AppText variant="label" color={ready ? 'success' : 'primary'}>{value}</AppText>
    </View>
  );
}
