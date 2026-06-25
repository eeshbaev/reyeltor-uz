import { getRenovationCostPerM2Uzs } from '@/lib/market/marketDataStore';

export const RENOVATION_LEVELS = ['cosmetic', 'basic', 'medium', 'premium', 'luxury'] as const;

export type RenovationLevel = (typeof RENOVATION_LEVELS)[number];

/** Moving-costs tool uses a subset without cosmetic/luxury. */
export const MOVING_RENOVATION_LEVELS = ['none', 'basic', 'medium', 'premium'] as const;
export type MovingRenovationLevel = (typeof MOVING_RENOVATION_LEVELS)[number];

export function getRenovationCostPerM2(level: RenovationLevel): number {
  return getRenovationCostPerM2Uzs(level);
}

export function getMovingRenovationCostPerM2(level: Exclude<MovingRenovationLevel, 'none'>): number {
  return getRenovationCostPerM2Uzs(level);
}
