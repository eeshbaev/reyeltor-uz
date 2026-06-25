import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import {
  ToolCard,
  ToolField,
  ToolMetricCard,
  ToolPill,
  ToolReadOnlyBox,
  toolScreenStyles,
} from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import {
  calculateEarlyRepayment,
  calculateLoan,
  type LoanParams,
} from '@/lib/tools/mortgage';
import { buildMortgageReportHtml } from '@/lib/tools/mortgageReport';
import { MoneyInput } from '@/components/tools/MoneyInput';
import { PercentInput } from '@/components/tools/PercentInput';
import { formatDecimalInput, parseNumericInput } from '@/lib/tools/parseNumeric';
import { useTheme } from '@/lib/theme';

const TERM_PRESETS = [5, 10, 15, 20, 25, 30];

export default function MortgageCalculatorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useFormatPrice();
  const { price: routePrice } = useLocalSearchParams<{ price?: string }>();

  const initialPrice = routePrice ? parseNumericInput(routePrice) : 0;
  const [price, setPrice] = useState(initialPrice);
  const [downPayment, setDownPayment] = useState(initialPrice > 0 ? Math.round(initialPrice * 0.2) : 0);
  const [rate, setRate] = useState(24);
  const [termYears, setTermYears] = useState(20);
  const [paymentType, setPaymentType] = useState<'annuity' | 'differential'>('annuity');
  const [extraPayment, setExtraPayment] = useState(0);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const downPercent = useMemo(() => {
    if (price <= 0 || downPayment <= 0) return 0;
    return Math.round((downPayment / price) * 1000) / 10;
  }, [price, downPayment]);

  const loanParams: LoanParams = useMemo(
    () => ({ price, downPayment, annualRate: rate, termYears, type: paymentType }),
    [price, downPayment, rate, termYears, paymentType],
  );

  const result = useMemo(() => calculateLoan(loanParams), [loanParams]);
  const earlyRepay = useMemo(() => calculateEarlyRepayment(loanParams, extraPayment), [loanParams, extraPayment]);
  const displayResult = earlyRepay.forecast ?? result;

  const visibleSchedule = showFullSchedule ? displayResult.schedule : displayResult.schedule.slice(0, 6);
  const interestDanger =
    displayResult.loanAmount > 0 && displayResult.bankOverpayment > displayResult.loanAmount * 0.5;

  const reportLabels = useMemo(
    () => ({
      title: t('tools.mortgage.title'),
      tagline: t('tools.export.reportTagline'),
      generated: t('tools.export.reportGenerated'),
      price: t('tools.mortgage.price'),
      downPayment: t('tools.mortgage.downPayment'),
      downPercent: t('tools.mortgage.downPercent'),
      rate: t('tools.mortgage.rate'),
      term: t('tools.mortgage.term'),
      paymentType: t('tools.mortgage.paymentType'),
      annuity: t('tools.mortgage.annuity'),
      differential: t('tools.mortgage.differential'),
      monthlyPayment: t('tools.mortgage.monthlyPayment'),
      loanAmount: t('tools.mortgage.loanAmount'),
      totalPaid: t('tools.mortgage.totalPaid'),
      bankOverpayment: t('tools.mortgage.bankOverpayment'),
      totalInterest: t('tools.mortgage.bankOverpayment'),
      schedule: t('tools.mortgage.schedule'),
      month: t('tools.mortgage.month'),
      payment: t('tools.mortgage.payment'),
      principal: t('tools.mortgage.principal'),
      interest: t('tools.mortgage.interest'),
      balance: t('tools.mortgage.balance'),
      footer: t('tools.export.reportFooter'),
    }),
    [t],
  );

  const buildReportHtml = useCallback(
    () =>
      buildMortgageReportHtml({
        labels: reportLabels,
        price,
        downPayment,
        downPercent,
        rate,
        termYears,
        paymentType,
        formatPrice,
        result: displayResult,
      }),
    [reportLabels, price, downPayment, downPercent, rate, termYears, paymentType, formatPrice, displayResult],
  );

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
    >
      <ToolCard>
        <ToolField label={t('tools.mortgage.price')}>
          <MoneyInput value={price} onChangeValue={setPrice} suffix="UZS" />
        </ToolField>

        <View style={toolScreenStyles.row}>
          <View style={toolScreenStyles.flex2}>
            <ToolField label={t('tools.mortgage.downPayment')}>
              <MoneyInput value={downPayment} onChangeValue={setDownPayment} suffix="UZS" />
            </ToolField>
          </View>
          <View style={toolScreenStyles.flex1}>
            <ToolField label={t('tools.mortgage.downPercent')}>
              <ToolReadOnlyBox>
                <AppText variant="body" color={downPercent > 0 ? 'primary' : 'tertiary'}>
                  {downPercent > 0 ? formatDecimalInput(downPercent) : '—'}
                </AppText>
                <AppText variant="caption" color="secondary">
                  %
                </AppText>
              </ToolReadOnlyBox>
            </ToolField>
          </View>
        </View>

        <ToolField label={t('tools.mortgage.rate')}>
          <PercentInput value={rate} onChangeValue={setRate} placeholder="24" />
        </ToolField>

        <ToolField label={t('tools.mortgage.term')}>
          <View style={toolScreenStyles.pills}>
            {TERM_PRESETS.map((years) => (
              <ToolPill
                key={years}
                label={`${years}y`}
                active={termYears === years}
                onPress={() => setTermYears(years)}
              />
            ))}
          </View>
        </ToolField>

        <ToolField label={t('tools.mortgage.paymentType')}>
          <View style={toolScreenStyles.pills}>
            <ToolPill
              label={t('tools.mortgage.annuity')}
              active={paymentType === 'annuity'}
              onPress={() => setPaymentType('annuity')}
            />
            <ToolPill
              label={t('tools.mortgage.differential')}
              active={paymentType === 'differential'}
              onPress={() => setPaymentType('differential')}
            />
          </View>
          <AppText variant="caption" color="secondary" style={toolScreenStyles.note}>
            {paymentType === 'annuity' ? t('tools.mortgage.annuityNote') : t('tools.mortgage.differentialNote')}
          </AppText>
        </ToolField>
      </ToolCard>

      <AppText variant="h3" style={toolScreenStyles.sectionTitle}>
        {t('tools.mortgage.summary')}
      </AppText>
      <View style={toolScreenStyles.metricGrid}>
        <ToolMetricCard style={toolScreenStyles.metricGridItem} label={t('tools.mortgage.monthlyPayment')} value={formatPrice(displayResult.monthlyPayment)} accent />
        <ToolMetricCard style={toolScreenStyles.metricGridItem} label={t('tools.mortgage.loanAmount')} value={formatPrice(displayResult.loanAmount)} />
        <ToolMetricCard style={toolScreenStyles.metricGridItem} label={t('tools.mortgage.totalPaid')} value={formatPrice(displayResult.totalPaid)} />
        <ToolMetricCard
          style={toolScreenStyles.metricGridItem}
          label={t('tools.mortgage.bankOverpayment')}
          value={formatPrice(displayResult.bankOverpayment)}
          danger={interestDanger}
        />
      </View>

      <AppText variant="h3" style={toolScreenStyles.sectionTitle}>
        {t('tools.mortgage.earlyRepayment')}
      </AppText>
      <ToolCard>
        <ToolField label={t('tools.mortgage.extraPayment')}>
          <MoneyInput
            value={extraPayment}
            onChangeValue={setExtraPayment}
            suffix="UZS"
          />
        </ToolField>
        {extraPayment > 0 ? (
          <View style={toolScreenStyles.earlyResults}>
            <AppText variant="body">
              {t('tools.mortgage.payOffEarlier', { months: earlyRepay.monthsSaved })}
            </AppText>
            <AppText variant="body">
              {t('tools.mortgage.interestSavedAmount', { amount: formatPrice(earlyRepay.interestSaved) })}
            </AppText>
            <AppText variant="body" color="secondary">
              {t('tools.mortgage.newTerm', {
                years: Math.floor(earlyRepay.newTermMonths / 12),
                months: earlyRepay.newTermMonths % 12,
              })}
            </AppText>
          </View>
        ) : null}
      </ToolCard>

      {displayResult.schedule.length > 0 ? (
        <>
          <AppText variant="h3" style={toolScreenStyles.sectionTitle}>
            {t('tools.mortgage.schedule')}
          </AppText>
          <ToolCard>
            <ScheduleHeader />
            {showFullSchedule && displayResult.schedule.length > 50 ? (
              <View style={{ height: Math.min(displayResult.schedule.length * 36, 400) }}>
                <FlashList
                  data={displayResult.schedule}
                  estimatedItemSize={36}
                  keyExtractor={(item) => String(item.month)}
                  renderItem={({ item }) => <ScheduleRow row={item} formatPrice={formatPrice} />}
                />
              </View>
            ) : (
              visibleSchedule.map((row) => (
                <ScheduleRow key={row.month} row={row} formatPrice={formatPrice} />
              ))
            )}
            {displayResult.schedule.length > 6 ? (
              <Pressable onPress={() => setShowFullSchedule(!showFullSchedule)} style={toolScreenStyles.showAll}>
                <AppText variant="label" color="accent">
                  {showFullSchedule
                    ? t('common.showLess')
                    : t('tools.mortgage.showAll', { months: displayResult.schedule.length })}
                </AppText>
              </Pressable>
            ) : null}
          </ToolCard>
        </>
      ) : null}

      <ToolReportExport
        visible={result.loanAmount > 0}
        title={t('tools.mortgage.title')}
        buildHtml={buildReportHtml}
      />
    </ScrollView>
  );
}

function ScheduleHeader() {
  const { t } = useTranslation();
  return (
    <View style={toolScreenStyles.scheduleRow}>
      <AppText variant="micro" color="secondary" style={toolScreenStyles.colMonth}>
        {t('tools.mortgage.month')}
      </AppText>
      <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>
        {t('tools.mortgage.payment')}
      </AppText>
      <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>
        {t('tools.mortgage.principal')}
      </AppText>
      <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>
        {t('tools.mortgage.interest')}
      </AppText>
      <AppText variant="micro" color="secondary" style={toolScreenStyles.col}>
        {t('tools.mortgage.balance')}
      </AppText>
    </View>
  );
}

function ScheduleRow({
  row,
  formatPrice,
}: {
  row: { month: number; payment: number; principal: number; interest: number; balance: number };
  formatPrice: (n: number) => string;
}) {
  return (
    <View style={toolScreenStyles.scheduleRow}>
      <AppText variant="caption" style={toolScreenStyles.colMonth}>
        {row.month}
      </AppText>
      <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>
        {formatPrice(row.payment)}
      </AppText>
      <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>
        {formatPrice(row.principal)}
      </AppText>
      <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>
        {formatPrice(row.interest)}
      </AppText>
      <AppText variant="caption" style={toolScreenStyles.col} numberOfLines={1}>
        {formatPrice(row.balance)}
      </AppText>
    </View>
  );
}
