const DTI_RATIO = 0.35;
const TARGET_DOWN_PERCENTS = [20, 30] as const;

export interface AffordabilityParams {
  monthlyIncome: number;
  /** Rent, food, utilities, transport — recurring costs to live each month */
  monthlyLivingExpenses: number;
  /** Existing loan and credit payments (excluding planned new mortgage) */
  monthlyDebtPayments: number;
  savedDownPayment: number;
  annualRate: number;
  termYears: number;
  monthlySavings: number;
  targetPropertyPrice?: number;
}

export interface AffordabilityScenario {
  downPercent: number;
  downPaymentRequired: number;
  downPaymentShortfall: number;
  loanAmount: number;
  monthlyPayment: number;
  canAfford: boolean;
}

export interface AffordabilityResult {
  maxMonthlyPayment: number;
  maxLoanAmount: number;
  maxPropertyPrice: number;
  incomeLimited: boolean;
  /** Whether bank DTI cap or living expenses left less room for a mortgage */
  limitingFactor: 'bank' | 'living' | 'none';
  monthsToSaveFor10Percent: number;
  monthsToSaveFor20Percent: number;
  monthsToSaveFor30Percent: number;
  targetScenarios: AffordabilityScenario[];
}

export function annuityMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  termYears: number,
): number {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (loanAmount <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return loanAmount / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (loanAmount * monthlyRate * factor) / (factor - 1);
}

function maxLoanFromPayment(
  monthlyPayment: number,
  annualRate: number,
  termYears: number,
): number {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (monthlyPayment <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return monthlyPayment * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (monthlyPayment * (factor - 1)) / (monthlyRate * factor);
}

function analyzeTargetProperty(
  targetPrice: number,
  savedDownPayment: number,
  maxMonthlyPayment: number,
  annualRate: number,
  termYears: number,
): AffordabilityScenario[] {
  if (targetPrice <= 0) return [];

  return TARGET_DOWN_PERCENTS.map((downPercent) => {
    const downPaymentRequired = Math.round(targetPrice * (downPercent / 100));
    const downPaymentShortfall = Math.max(0, downPaymentRequired - savedDownPayment);
    const loanAmount = Math.max(0, targetPrice - downPaymentRequired);
    const monthlyPayment = annuityMonthlyPayment(loanAmount, annualRate, termYears);
    const paymentOk = monthlyPayment <= maxMonthlyPayment + 1;
    const downOk = downPaymentShortfall === 0;
    const canAfford = paymentOk && downOk;

    return {
      downPercent,
      downPaymentRequired,
      downPaymentShortfall,
      loanAmount: Math.round(loanAmount),
      monthlyPayment: Math.round(monthlyPayment),
      canAfford,
    };
  });
}

export function calculateAffordability(params: AffordabilityParams): AffordabilityResult {
  const {
    monthlyIncome,
    monthlyLivingExpenses,
    monthlyDebtPayments,
    savedDownPayment,
    annualRate,
    termYears,
    monthlySavings,
    targetPropertyPrice = 0,
  } = params;

  const bankMaxPayment = Math.max(0, monthlyIncome * DTI_RATIO - monthlyDebtPayments);
  const practicalMaxPayment = Math.max(
    0,
    monthlyIncome - monthlyLivingExpenses - monthlyDebtPayments,
  );
  const maxMonthlyPayment = Math.min(bankMaxPayment, practicalMaxPayment);
  const limitingFactor: AffordabilityResult['limitingFactor'] =
    maxMonthlyPayment <= 0
      ? bankMaxPayment <= practicalMaxPayment
        ? 'bank'
        : 'living'
      : bankMaxPayment < practicalMaxPayment
        ? 'bank'
        : practicalMaxPayment < bankMaxPayment
          ? 'living'
          : 'none';
  const maxLoanAmount = maxLoanFromPayment(maxMonthlyPayment, annualRate, termYears);
  const incomeLimited = maxMonthlyPayment <= 0;
  const maxPropertyPrice = Math.round(maxLoanAmount + savedDownPayment);

  const calcMonthsToSave = (targetPercent: number) => {
    if (maxLoanAmount <= 0) return Infinity;
    const targetDown = (maxPropertyPrice * targetPercent) / 100;
    const needed = Math.max(0, targetDown - savedDownPayment);
    return monthlySavings > 0 ? Math.ceil(needed / monthlySavings) : Infinity;
  };

  return {
    maxMonthlyPayment: Math.round(maxMonthlyPayment),
    maxLoanAmount: Math.round(maxLoanAmount),
    maxPropertyPrice,
    incomeLimited,
    limitingFactor,
    monthsToSaveFor10Percent: calcMonthsToSave(10),
    monthsToSaveFor20Percent: calcMonthsToSave(20),
    monthsToSaveFor30Percent: calcMonthsToSave(30),
    targetScenarios: analyzeTargetProperty(
      targetPropertyPrice,
      savedDownPayment,
      maxMonthlyPayment,
      annualRate,
      termYears,
    ),
  };
}
