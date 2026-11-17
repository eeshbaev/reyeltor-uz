/** Offline fallback — approximate monthly CBU USD/UZS (updated Aug 2026). */
export const CBU_RATE_HISTORY = [
  { date: '2025-09', rate: 12_650 },
  { date: '2025-10', rate: 12_800 },
  { date: '2025-11', rate: 12_900 },
  { date: '2025-12', rate: 13_000 },
  { date: '2026-01', rate: 13_100 },
  { date: '2026-02', rate: 13_050 },
  { date: '2026-03', rate: 12_900 },
  { date: '2026-04', rate: 12_750 },
  { date: '2026-05', rate: 12_500 },
  { date: '2026-06', rate: 12_200 },
  { date: '2026-07', rate: 11_950 },
  { date: '2026-08', rate: 11_847 },
];

export function getBundledRatePoints(): Array<{ date: string; rate: number }> {
  return CBU_RATE_HISTORY.map((entry) => ({
    date: `${entry.date}-15`,
    rate: entry.rate,
  }));
}

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
