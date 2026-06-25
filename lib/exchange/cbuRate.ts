const CBU_USD_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD/';
const FALLBACK_USD_RATE = 12_017;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CbuRateRow {
  Rate: string;
  Date: string;
}

let cachedRate: { rate: number; fetchedAt: number } | null = null;

export async function fetchCbuUsdRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.rate;
  }

  try {
    const response = await fetch(CBU_USD_URL);
    if (!response.ok) throw new Error('CBU rate fetch failed');
    const rows = (await response.json()) as CbuRateRow[];
    const rate = Number(rows[0]?.Rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid CBU rate');
    cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return cachedRate?.rate ?? FALLBACK_USD_RATE;
  }
}

export function uzsToUsd(amountUzs: number, usdRate: number): number {
  return amountUzs / usdRate;
}

export function usdToUzs(amountUsd: number, usdRate: number): number {
  return Math.round(amountUsd * usdRate);
}

export function filterPriceToUzs(
  value: string,
  currency: 'UZS' | 'USD',
  usdRate: number,
): number | null {
  const num = Number(value.replace(/\s/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  return currency === 'USD' ? usdToUzs(num, usdRate) : num;
}
