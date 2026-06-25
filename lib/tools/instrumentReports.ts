import type { AffordabilityResult } from '@/lib/tools/affordability';
import type { LoanSummary, MonthlyRow } from '@/lib/tools/mortgage';
import type { RentVsBuyResult } from '@/lib/tools/rentVsBuy';
import type { MovingCostResult } from '@/lib/tools/movingCosts';
import type { RenovationResult } from '@/lib/tools/renovation';
import {
  bannerHtml,
  buildToolReportHtml,
  formatReportDecimal,
  inputsHtml,
  linesHtml,
  metricsGridHtml,
  sectionHtml,
  tableHtml,
} from '@/lib/tools/toolReport';

export interface ToolReportMeta {
  title: string;
  tagline: string;
  generated: string;
  footer: string;
}

function scheduleRowsHtml(schedule: MonthlyRow[], formatPrice: (n: number) => string): string[][] {
  return schedule.map((row) => [
    String(row.month),
    formatPrice(row.payment),
    formatPrice(row.principal),
    formatPrice(row.interest),
    formatPrice(row.balance),
  ]);
}

export async function buildMortgageReportHtml(input: {
  labels: ToolReportMeta & {
    price: string;
    downPayment: string;
    downPercent: string;
    rate: string;
    term: string;
    paymentType: string;
    annuity: string;
    differential: string;
    monthlyPayment: string;
    loanAmount: string;
    totalPaid: string;
    totalInterest: string;
    schedule: string;
    month: string;
    payment: string;
    principal: string;
    interest: string;
    balance: string;
  };
  price: number;
  downPayment: number;
  downPercent: number;
  rate: number;
  termYears: number;
  paymentType: 'annuity' | 'differential';
  formatPrice: (value: number) => string;
  result: LoanSummary;
}): Promise<string> {
  const { labels, result, formatPrice, paymentType, price, downPayment, downPercent, rate, termYears } = input;
  const paymentLabel = paymentType === 'annuity' ? labels.annuity : labels.differential;

  const body = [
    inputsHtml([
      { label: labels.price, value: formatPrice(price) },
      { label: labels.downPayment, value: formatPrice(downPayment) },
      { label: labels.downPercent, value: downPercent > 0 ? `${formatReportDecimal(downPercent)}%` : '—' },
      { label: labels.rate, value: `${formatReportDecimal(rate)}%` },
      { label: labels.term, value: String(termYears) },
      { label: labels.paymentType, value: paymentLabel },
    ]),
    sectionHtml(
      labels.monthlyPayment,
      metricsGridHtml([
        { label: labels.monthlyPayment, value: formatPrice(result.monthlyPayment), accent: true },
        { label: labels.loanAmount, value: formatPrice(result.loanAmount) },
        { label: labels.totalPaid, value: formatPrice(result.totalPaid) },
        { label: labels.totalInterest, value: formatPrice(result.totalInterest), danger: true },
      ]),
    ),
    result.schedule.length > 0
      ? sectionHtml(
          labels.schedule,
          tableHtml(
            [labels.month, labels.payment, labels.principal, labels.interest, labels.balance],
            scheduleRowsHtml(result.schedule, formatPrice),
          ),
        )
      : '',
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}

export async function buildRentVsBuyReportHtml(input: {
  labels: ToolReportMeta & {
    monthlyRent: string;
    price: string;
    downPayment: string;
    rate: string;
    term: string;
    appreciation: string;
    rentIncrease: string;
    yearsToStay: string;
    recommendation: string;
    totalRentCost: string;
    netBuyCost: string;
    propertyValue: string;
    equityBuilt: string;
    year: string;
    difference: string;
    yearlyBreakdown: string;
    atExit: string;
    resultsInUzs: string;
  };
  monthlyRentDisplay: string;
  propertyPrice: number;
  downPayment: number;
  annualLoanRate: number;
  termYears: number;
  appreciation: number;
  rentIncrease: number;
  yearsToStay: number;
  recommendationText: string;
  formatUzs: (value: number) => string;
  result: RentVsBuyResult;
}): Promise<string> {
  const { labels, result, formatUzs, recommendationText } = input;

  const body = [
    inputsHtml([
      { label: labels.monthlyRent, value: input.monthlyRentDisplay },
      { label: labels.price, value: formatUzs(input.propertyPrice) },
      { label: labels.downPayment, value: formatUzs(input.downPayment) },
      { label: labels.rate, value: `${formatReportDecimal(input.annualLoanRate)}%` },
      { label: labels.term, value: `${input.termYears}y` },
      { label: labels.appreciation, value: `${formatReportDecimal(input.appreciation)}%` },
      { label: labels.rentIncrease, value: `${formatReportDecimal(input.rentIncrease)}%` },
      { label: labels.yearsToStay, value: `${input.yearsToStay}y` },
    ]),
    `<p class="note">${labels.resultsInUzs}</p>`,
    bannerHtml(recommendationText),
    metricsGridHtml([
      { label: labels.totalRentCost, value: formatUzs(result.totalRentCost) },
      { label: labels.netBuyCost, value: formatUzs(result.netBuyCost) },
    ]),
    sectionHtml(
      labels.yearlyBreakdown,
      tableHtml(
        [labels.year, labels.totalRentCost, labels.netBuyCost, labels.difference],
        result.yearlyData.map((row) => {
          const diff = row.cumulativeRentCost - row.netCostToBuy;
          return [
            String(row.year),
            formatUzs(row.cumulativeRentCost),
            formatUzs(row.netCostToBuy),
            formatUzs(Math.abs(diff)),
          ];
        }),
      ),
    ),
    sectionHtml(
      labels.atExit,
      linesHtml([
        { label: labels.propertyValue, value: formatUzs(result.propertyValueAtExit) },
        { label: labels.equityBuilt, value: formatUzs(result.equityBuilt) },
      ]),
    ),
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}

export async function buildAffordabilityReportHtml(input: {
  labels: ToolReportMeta & {
    monthlyIncome: string;
    monthlyLivingExpenses: string;
    monthlyDebtPayments: string;
    currentSavings: string;
    targetPrice: string;
    rate: string;
    term: string;
    monthlySavings: string;
    canAfford: string;
    maxPayment: string;
    maxLoan: string;
    incomeLimitedNote: string;
    targetProperty: string;
    requiredDown: string;
    requiredPayment: string;
    downShortfall: string;
    affordable: string;
    notAffordable: string;
    savingsTimeline: string;
    downPercent10: string;
    downPercent20: string;
    downPercent30: string;
    disclaimer: string;
  };
  monthlyIncome: number;
  monthlyLivingExpenses: number;
  monthlyDebtPayments: number;
  savedDownPayment: number;
  targetPropertyPrice: number;
  annualRate: number;
  termYears: number;
  monthlySavings: number;
  headlineLabel: string;
  headlineValue: number;
  formatUzs: (value: number) => string;
  formatMonths: (months: number) => string;
  result: AffordabilityResult;
}): Promise<string> {
  const { labels, result, formatUzs, formatMonths } = input;

  const inputs = [
    { label: labels.monthlyIncome, value: formatUzs(input.monthlyIncome) },
    { label: labels.monthlyLivingExpenses, value: formatUzs(input.monthlyLivingExpenses) },
    { label: labels.monthlyDebtPayments, value: formatUzs(input.monthlyDebtPayments) },
    { label: labels.currentSavings, value: formatUzs(input.savedDownPayment) },
    { label: labels.rate, value: `${formatReportDecimal(input.annualRate)}%` },
    { label: labels.term, value: `${input.termYears}y` },
    { label: labels.monthlySavings, value: formatUzs(input.monthlySavings) },
  ];
  if (input.targetPropertyPrice > 0) {
    inputs.splice(3, 0, { label: labels.targetPrice, value: formatUzs(input.targetPropertyPrice) });
  }

  const sections: string[] = [
    inputsHtml(inputs),
    sectionHtml(
      input.headlineLabel,
      metricsGridHtml([{ label: input.headlineLabel, value: formatUzs(input.headlineValue), accent: true }]),
    ),
  ];

  if (result.incomeLimited) {
    sections.push(`<p class="note">${labels.incomeLimitedNote}</p>`);
  }

  sections.push(
    linesHtml([
      { label: labels.maxPayment, value: formatUzs(result.maxMonthlyPayment) },
      { label: labels.maxLoan, value: formatUzs(result.maxLoanAmount) },
    ]),
  );

  if (input.targetPropertyPrice > 0 && result.targetScenarios.length > 0) {
    for (const scenario of result.targetScenarios) {
      const downLabel = labels.requiredDown.replace('{{percent}}', String(scenario.downPercent));
      const lines = [
        { label: downLabel, value: formatUzs(scenario.downPaymentRequired) },
        { label: labels.requiredPayment, value: formatUzs(scenario.monthlyPayment) },
      ];
      if (scenario.downPaymentShortfall > 0) {
        lines.push({ label: labels.downShortfall, value: formatUzs(scenario.downPaymentShortfall) });
      }
      lines.push({
        label: labels.targetProperty,
        value: scenario.canAfford ? labels.affordable : labels.notAffordable,
      });
      sections.push(sectionHtml(`${labels.targetProperty} (${scenario.downPercent}%)`, linesHtml(lines)));
    }
  }

  if (result.maxLoanAmount > 0) {
    sections.push(
      sectionHtml(
        labels.savingsTimeline,
        linesHtml([
          { label: labels.downPercent10, value: formatMonths(result.monthsToSaveFor10Percent) },
          { label: labels.downPercent20, value: formatMonths(result.monthsToSaveFor20Percent) },
          { label: labels.downPercent30, value: formatMonths(result.monthsToSaveFor30Percent) },
        ]),
      ),
    );
  }

  sections.push(`<p class="note">${labels.disclaimer}</p>`);

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: sections.join(''),
  });
}

export async function buildMovingCostsReportHtml(input: {
  labels: ToolReportMeta & {
    transactionType: string;
    monthlyRent: string;
    price: string;
    area: string;
    rooms: string;
    renovation: string;
    furniture: string;
    total: string;
    disclaimer: string;
    rent: string;
    buy: string;
    yes: string;
    no: string;
  };
  transactionType: 'rent' | 'buy';
  monthlyRent: number;
  propertyPrice: number;
  areaM2: number;
  rooms: number;
  renovationLabel: string;
  includesFurniture: boolean;
  formatPrice: (value: number) => string;
  result: MovingCostResult;
  itemLabel: (item: MovingCostResult['items'][number]) => string;
  itemNote: (item: MovingCostResult['items'][number]) => string;
}): Promise<string> {
  const { labels, result, formatPrice, transactionType, itemLabel, itemNote } = input;
  const typeLabel = transactionType === 'rent' ? labels.rent : labels.buy;

  const inputRows =
    transactionType === 'rent'
      ? [
          { label: labels.transactionType, value: typeLabel },
          { label: labels.monthlyRent, value: formatPrice(input.monthlyRent) },
          { label: labels.area, value: input.areaM2 > 0 ? `${input.areaM2} m²` : `~${input.rooms * 40} m²` },
          { label: labels.rooms, value: String(input.rooms) },
          { label: labels.renovation, value: input.renovationLabel },
          { label: labels.furniture, value: input.includesFurniture ? labels.yes : labels.no },
        ]
      : [
          { label: labels.transactionType, value: typeLabel },
          { label: labels.price, value: formatPrice(input.propertyPrice) },
          { label: labels.area, value: `${input.areaM2} m²` },
          { label: labels.rooms, value: String(input.rooms) },
          { label: labels.renovation, value: input.renovationLabel },
          { label: labels.furniture, value: input.includesFurniture ? labels.yes : labels.no },
        ];

  const body = [
    inputsHtml(inputRows),
    linesHtml(
      result.items.map((item) => {
        const note = itemNote(item);
        return {
          label: note ? `${itemLabel(item)} (${note})` : itemLabel(item),
          value: formatPrice(item.amount),
        };
      }),
    ),
    metricsGridHtml([{ label: labels.total, value: formatPrice(result.total), accent: true }]),
    `<p class="note">${labels.disclaimer}</p>`,
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}

export async function buildRenovationReportHtml(input: {
  labels: ToolReportMeta & {
    area: string;
    level: string;
    ratePerM2: string;
    total: string;
    disclaimer: string;
    materials: string;
    labor: string;
    contingency: string;
    furniture: string;
    includeFurniture: string;
    yes: string;
    no: string;
  };
  areaM2: number;
  levelLabel: string;
  includeFurniture: boolean;
  formatPrice: (value: number) => string;
  result: RenovationResult;
  itemLabel: (key: string) => string;
  itemNote: (item: RenovationResult['items'][number]) => string;
}): Promise<string> {
  const { labels, result, formatPrice, itemLabel, itemNote } = input;

  const body = [
    inputsHtml([
      { label: labels.area, value: `${input.areaM2} m²` },
      { label: labels.level, value: input.levelLabel },
      { label: labels.includeFurniture, value: input.includeFurniture ? labels.yes : labels.no },
      { label: labels.ratePerM2, value: `${formatPrice(result.ratePerM2)}/m²` },
    ]),
    linesHtml(
      result.items.map((item) => {
        const note = itemNote(item);
        return {
          label: note ? `${itemLabel(item.key)} (${note})` : itemLabel(item.key),
          value: formatPrice(item.amount),
        };
      }),
    ),
    metricsGridHtml([{ label: labels.total, value: formatPrice(result.total), accent: true }]),
    `<p class="note">${labels.disclaimer}</p>`,
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}

export async function buildDistrictComparisonReportHtml(input: {
  labels: ToolReportMeta & {
    districtA: string;
    districtB: string;
    category: string;
    residential: string;
    commercial: string;
    avgRent: string;
    avgSale: string;
    avgLease: string;
    summary: string;
  };
  districtA: string;
  districtB: string;
  category: 'residential' | 'commercial';
  rentLabel: string;
  rentA: string;
  rentB: string;
  saleA: string;
  saleB: string;
  summary: string;
}): Promise<string> {
  const { labels } = input;
  const categoryLabel = input.category === 'residential' ? labels.residential : labels.commercial;

  const body = [
    inputsHtml([
      { label: labels.category, value: categoryLabel },
      { label: labels.districtA, value: input.districtA },
      { label: labels.districtB, value: input.districtB },
    ]),
    tableHtml(
      ['', input.districtA, input.districtB],
      [
        [input.rentLabel, input.rentA, input.rentB],
        [labels.avgSale, input.saleA, input.saleB],
      ],
    ),
    bannerHtml(input.summary),
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}

export async function buildCurrencyHistoryReportHtml(input: {
  labels: ToolReportMeta & {
    currentRate: string;
    propertyPriceUsd: string;
    period: string;
    rate: string;
    priceUzs: string;
    source: string;
  };
  usdRate: number;
  priceUsd: number;
  history: Array<{ date: string; rate: number; priceUzs: number }>;
  formatUzs: (value: number) => string;
}): Promise<string> {
  const { labels, history, formatUzs } = input;

  const body = [
    metricsGridHtml([
      { label: labels.currentRate, value: `${new Intl.NumberFormat('uz-UZ').format(input.usdRate)} UZS`, accent: true },
      { label: labels.propertyPriceUsd, value: `$${new Intl.NumberFormat('en-US').format(input.priceUsd)}` },
    ]),
    sectionHtml(
      labels.period,
      tableHtml(
        [labels.period, labels.rate, labels.priceUzs],
        history.map((row) => [
          row.date,
          new Intl.NumberFormat('uz-UZ').format(row.rate),
          formatUzs(row.priceUzs),
        ]),
      ),
    ),
    `<p class="note">${labels.source}</p>`,
  ].join('');

  return buildToolReportHtml({
    title: labels.title,
    tagline: labels.tagline,
    generatedLabel: labels.generated,
    footer: labels.footer,
    bodyHtml: body,
  });
}
