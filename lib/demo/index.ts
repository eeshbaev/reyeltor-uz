import type { PriceHistoryEntry, User } from '@/types';
import { DEMO_AGENTS } from './agents';
import { ALL_DEMO_LISTINGS } from './commercialListings';
import type { DemoListing } from './listings';
import { enrichListing } from '@/lib/listing';

export function isDemoId(id: string): boolean {
  return id.startsWith('a000000') || id.startsWith('l000000');
}

export function getDemoAgents(): User[] {
  return DEMO_AGENTS;
}

export function getDemoAgentById(id: string): User | null {
  return DEMO_AGENTS.find((a) => a.id === id) ?? null;
}

export function getDemoListings(): DemoListing[] {
  return ALL_DEMO_LISTINGS.map(enrichListing);
}

export function getDemoListingById(id: string): DemoListing | null {
  return ALL_DEMO_LISTINGS.map(enrichListing).find((l) => l.id === id) ?? null;
}

export function getDemoAgentListings(userId: string, status: 'active' | 'archived' = 'active'): DemoListing[] {
  return ALL_DEMO_LISTINGS.map(enrichListing).filter((l) => l.user_id === userId && l.status === status);
}

export function getDemoPriceHistory(listingId: string): PriceHistoryEntry[] {
  return DEMO_PRICE_HISTORY.filter((h) => h.listing_id === listingId);
}

export function getDemoAreaMedianPrice(district: string, rooms: number, type: string): number | null {
  const matches = ALL_DEMO_LISTINGS.filter(
    (l) => l.district === district && l.rooms === rooms && l.type === type && l.status === 'active',
  );
  if (matches.length === 0) return null;
  const prices = matches.map((l) => l.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
}

const DEMO_PRICE_HISTORY: PriceHistoryEntry[] = [
  {
    id: 'ph-001',
    listing_id: 'l0000001-0000-4000-8000-000000000001',
    old_price: 5_600_000,
    new_price: 5_200_000,
    changed_at: daysAgoIso(12),
  },
  {
    id: 'ph-002',
    listing_id: 'l0000001-0000-4000-8000-000000000001',
    old_price: 5_900_000,
    new_price: 5_600_000,
    changed_at: daysAgoIso(28),
  },
  {
    id: 'ph-003',
    listing_id: 'l0000004-0000-4000-8000-000000000004',
    old_price: 26_000_000,
    new_price: 24_500_000,
    changed_at: daysAgoIso(5),
  },
  {
    id: 'ph-004',
    listing_id: 'l0000005-0000-4000-8000-000000000005',
    old_price: 4_600_000_000,
    new_price: 4_350_000_000,
    changed_at: daysAgoIso(8),
  },
];

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

