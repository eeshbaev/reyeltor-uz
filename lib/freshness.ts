import type { Listing } from '@/types';

/** Listings confirmed longer ago than this are labelled "not confirmed recently". */
export const FRESHNESS_STALE_DAYS = 30;
/** Owners are nudged to re-confirm after this many days. */
export const FRESHNESS_PROMPT_DAYS = 7;

export type FreshnessLevel = 'today' | 'recent' | 'aging' | 'stale';

export interface Freshness {
  level: FreshnessLevel;
  days: number;
}

/**
 * Based only on the server-controlled confirmation date — never on the posting date.
 * Returns null when the listing has no confirmation date (e.g. demo listings).
 */
export function getFreshness(
  listing: Pick<Listing, 'availability_confirmed_at'>,
  now: number = Date.now(),
): Freshness | null {
  if (!listing.availability_confirmed_at) return null;
  const confirmed = new Date(listing.availability_confirmed_at).getTime();
  if (!Number.isFinite(confirmed)) return null;
  const days = Math.max(0, Math.floor((now - confirmed) / 86_400_000));
  const level: FreshnessLevel =
    days === 0 ? 'today' : days <= FRESHNESS_PROMPT_DAYS ? 'recent' : days <= FRESHNESS_STALE_DAYS ? 'aging' : 'stale';
  return { level, days };
}

export function needsAvailabilityCheck(listing: Pick<Listing, 'availability_confirmed_at'>): boolean {
  const freshness = getFreshness(listing);
  return freshness !== null && freshness.days >= FRESHNESS_PROMPT_DAYS;
}
