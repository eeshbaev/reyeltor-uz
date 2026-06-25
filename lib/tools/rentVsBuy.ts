import { getMarketMacroRates } from '@/lib/market/marketDataStore';

/** @deprecated Use getMarketMacroRates().annualAppreciationPct */
export const TASHKENT_ANNUAL_APPRECIATION = 8;

/** @deprecated Use getMarketMacroRates().annualRentIncreasePct */
export const UZBEKISTAN_ANNUAL_RENT_INCREASE = 7;

export function getTashkentAnnualAppreciation(): number {
  return getMarketMacroRates().annualAppreciationPct;
}

export function getUzbekistanAnnualRentIncrease(): number {
  return getMarketMacroRates().annualRentIncreasePct;
}

export interface RentVsBuyParams {
  monthlyRent: number;
  propertyPrice: number;
  downPayment: number;
  annualLoanRate: number;
  termYears: number;
  annualAppreciation: number;
  annualRentIncrease: number;
  yearsToStay: number;
}

export interface RentVsBuyResult {
  totalRentCost: number;
  totalBuyCost: number;
  propertyValueAtExit: number;
  equityBuilt: number;
  netBuyCost: number;
  breakEvenYear: number;
  recommendation: 'buy' | 'rent' | 'neutral';
  yearlyData: Array<{
    year: number;
    cumulativeRentCost: number;
    cumulativeBuyCost: number;
    equity: number;
    netCostToBuy: number;
  }>;
}

export function calculateRentVsBuy(params: RentVsBuyParams): RentVsBuyResult {
  const {
    monthlyRent,
    propertyPrice,
    downPayment,
    annualLoanRate,
    termYears,
    annualAppreciation,
    annualRentIncrease,
    yearsToStay,
  } = params;

  const loanAmount = propertyPrice - downPayment;
  const monthlyRate = annualLoanRate / 100 / 12;
  const loanMonths = termYears * 12;
  const monthlyMortgage =
    loanAmount > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanMonths)) /
        (Math.pow(1 + monthlyRate, loanMonths) - 1)
      : 0;

  let cumulativeRent = 0;
  let cumulativeBuy = downPayment;
  let currentRent = monthlyRent;
  let loanBalance = loanAmount;
  let propertyValue = propertyPrice;
  let breakEvenYear = -1;
  const yearlyData = [];

  for (let year = 1; year <= yearsToStay; year++) {
    cumulativeRent += currentRent * 12;
    currentRent *= 1 + annualRentIncrease / 100;

    for (let m = 0; m < 12; m++) {
      if (loanBalance > 0) {
        const interest = loanBalance * monthlyRate;
        const principal = monthlyMortgage - interest;
        loanBalance = Math.max(0, loanBalance - principal);
        cumulativeBuy += monthlyMortgage;
      }
    }

    propertyValue *= 1 + annualAppreciation / 100;
    const equity = propertyValue - loanBalance;
    const netCostToBuy = cumulativeBuy - equity;

    if (breakEvenYear === -1 && netCostToBuy < cumulativeRent) {
      breakEvenYear = year;
    }

    yearlyData.push({
      year,
      cumulativeRentCost: Math.round(cumulativeRent),
      cumulativeBuyCost: Math.round(cumulativeBuy),
      equity: Math.round(equity),
      netCostToBuy: Math.round(netCostToBuy),
    });
  }

  const finalData = yearlyData[yearlyData.length - 1];
  const recommendation =
    finalData.netCostToBuy < cumulativeRent * 0.9
      ? 'buy'
      : finalData.netCostToBuy > cumulativeRent * 1.1
        ? 'rent'
        : 'neutral';

  return {
    totalRentCost: Math.round(cumulativeRent),
    totalBuyCost: Math.round(cumulativeBuy),
    propertyValueAtExit: Math.round(propertyValue),
    equityBuilt: Math.round(propertyValue - loanBalance),
    netBuyCost: Math.round(finalData.netCostToBuy),
    breakEvenYear,
    recommendation,
    yearlyData,
  };
}
