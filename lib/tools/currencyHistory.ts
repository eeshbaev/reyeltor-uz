export const CBU_RATE_HISTORY = [
  { date: '2024-01', rate: 12_200 },
  { date: '2024-04', rate: 12_400 },
  { date: '2024-07', rate: 12_600 },
  { date: '2024-10', rate: 12_800 },
  { date: '2025-01', rate: 12_900 },
  { date: '2025-04', rate: 12_950 },
  { date: '2025-07', rate: 13_100 },
  { date: '2025-10', rate: 13_200 },
  { date: '2026-01', rate: 12_800 },
  { date: '2026-04', rate: 12_017 },
];

export function getPropertyPriceInPastRates(
  priceUsd: number,
  points: Array<{ date: string; rate: number }>,
) {
  return points.map((entry) => ({
    date: entry.date,
    rate: entry.rate,
    priceUzs: Math.round(priceUsd * entry.rate),
  }));
}
