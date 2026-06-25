export function getCoinCost(activeListingCount: number): number {
  if (activeListingCount === 0) return 0;
  if (activeListingCount < 10) return 5;
  if (activeListingCount < 20) return 8;
  if (activeListingCount < 30) return 15;
  if (activeListingCount < 50) return 25;
  return 40;
}

export const COIN_TIERS = [
  { range: '0', cost: 0, labelKey: 'coins.tierFirst' },
  { range: '1–9', cost: 5, labelKey: 'coins.tier1' },
  { range: '10–19', cost: 8, labelKey: 'coins.tier2' },
  { range: '20–29', cost: 15, labelKey: 'coins.tier3' },
  { range: '30–49', cost: 25, labelKey: 'coins.tier4' },
  { range: '50+', cost: 40, labelKey: 'coins.tier5' },
] as const;
