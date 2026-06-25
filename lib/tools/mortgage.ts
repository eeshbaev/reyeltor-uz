export interface LoanParams {
  price: number;
  downPayment: number;
  annualRate: number;
  termYears: number;
  type: 'annuity' | 'differential';
}

export interface MonthlyRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanSummary {
  loanAmount: number;
  monthlyPayment: number;
  totalPaid: number;
  /** Interest paid to the bank on top of the loan principal. */
  bankOverpayment: number;
  /** @deprecated Use bankOverpayment — kept for reports. */
  totalInterest: number;
  schedule: MonthlyRow[];
}

function finalizeLoanSummary(
  loanAmount: number,
  monthlyPayment: number,
  schedule: MonthlyRow[],
): LoanSummary {
  const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0);
  const bankOverpayment = schedule.reduce((sum, row) => sum + row.interest, 0);
  return {
    loanAmount,
    monthlyPayment,
    totalPaid,
    bankOverpayment,
    totalInterest: bankOverpayment,
    schedule,
  };
}

export function calculateLoan(params: LoanParams): LoanSummary {
  const { price, downPayment, annualRate, termYears, type } = params;
  const loanAmount = Math.max(0, price - downPayment);
  const months = termYears * 12;
  const monthlyRate = annualRate / 100 / 12;

  if (loanAmount === 0 || monthlyRate === 0 || months === 0) {
    return {
      loanAmount: 0,
      monthlyPayment: 0,
      totalPaid: price,
      bankOverpayment: 0,
      totalInterest: 0,
      schedule: [],
    };
  }

  const schedule: MonthlyRow[] = [];

  if (type === 'annuity') {
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
    let balance = loanAmount;
    for (let m = 1; m <= months; m++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      balance = Math.max(0, balance - principal);
      schedule.push({
        month: m,
        payment: Math.round(monthlyPayment),
        principal: Math.round(principal),
        interest: Math.round(interest),
        balance: Math.round(balance),
      });
    }
    return finalizeLoanSummary(loanAmount, Math.round(monthlyPayment), schedule);
  }

  const principalPerMonth = loanAmount / months;
  let balance = loanAmount;
  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    const payment = principalPerMonth + interest;
    balance = Math.max(0, balance - principalPerMonth);
    schedule.push({
      month: m,
      payment: Math.round(payment),
      principal: Math.round(principalPerMonth),
      interest: Math.round(interest),
      balance: Math.round(balance),
    });
  }
  return finalizeLoanSummary(loanAmount, Math.round(schedule[0]?.payment ?? 0), schedule);
}

export function calculateWithRateIncrease(params: LoanParams, increasePercent: number): LoanSummary {
  return calculateLoan({ ...params, annualRate: params.annualRate + increasePercent });
}

export function calculateLoanWithExtraPayment(
  params: LoanParams,
  extraMonthlyPayment: number,
): LoanSummary {
  const base = calculateLoan(params);
  if (extraMonthlyPayment <= 0 || base.loanAmount === 0) {
    return base;
  }

  const { loanAmount } = base;
  const months = params.termYears * 12;
  const monthlyRate = params.annualRate / 100 / 12;
  const maxMonths = months * 2;

  const schedule: MonthlyRow[] = [];
  let balance = loanAmount;
  let month = 0;

  if (params.type === 'annuity') {
    const annuityPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    while (balance > 0 && month < maxMonths) {
      month++;
      const interest = balance * monthlyRate;
      const payment = Math.min(annuityPayment + extraMonthlyPayment, balance + interest);
      const principal = payment - interest;
      balance = Math.max(0, balance - principal);
      schedule.push({
        month,
        payment: Math.round(payment),
        principal: Math.round(principal),
        interest: Math.round(interest),
        balance: Math.round(balance),
      });
    }

    return finalizeLoanSummary(loanAmount, Math.round(annuityPayment + extraMonthlyPayment), schedule);
  }

  const principalPerMonth = loanAmount / months;
  while (balance > 0 && month < maxMonths) {
    month++;
    const interest = balance * monthlyRate;
    const scheduledPrincipal = Math.min(principalPerMonth, balance);
    const principal = Math.min(scheduledPrincipal + extraMonthlyPayment, balance);
    const payment = principal + interest;
    balance = Math.max(0, balance - principal);
    schedule.push({
      month,
      payment: Math.round(payment),
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.round(balance),
    });
  }

  return finalizeLoanSummary(loanAmount, schedule[0]?.payment ?? 0, schedule);
}

export interface EarlyRepaymentResult {
  monthsSaved: number;
  interestSaved: number;
  newTermMonths: number;
  forecast: LoanSummary | null;
}

export function calculateEarlyRepayment(
  params: LoanParams,
  extraMonthlyPayment: number,
): EarlyRepaymentResult {
  const base = calculateLoan(params);
  const originalMonths = base.schedule.length;

  if (extraMonthlyPayment <= 0) {
    return { monthsSaved: 0, interestSaved: 0, newTermMonths: originalMonths, forecast: null };
  }

  const forecast = calculateLoanWithExtraPayment(params, extraMonthlyPayment);
  const newTermMonths = forecast.schedule.length;
  const interestSaved = Math.max(0, base.bankOverpayment - forecast.bankOverpayment);

  return {
    monthsSaved: Math.max(0, originalMonths - newTermMonths),
    interestSaved,
    newTermMonths,
    forecast,
  };
}
