import { DEMO_AGENTS } from './agents';
import { assignUniqueDemoPhotos } from './assignPhotos';
import { ALL_DEMO_LISTINGS } from './commercialListings';
import { selectDemoListings } from './config';
import { generateDemoListings } from './generated';
import type { DemoListing } from './listings';
import { enrichListing } from '@/lib/listing';
import type { PriceHistoryEntry, User } from '@/types';

/** Demo agent/listing IDs use a000000* / l00000* prefixes (not valid Postgres UUIDs). */
export function isDemoId(id: string): boolean {
  return id.startsWith('a000000') || id.startsWith('l00000');
}

export function getDemoAgents(): User[] {
  return DEMO_AGENTS;
}

export function getDemoAgentById(id: string): User | null {
  return DEMO_AGENTS.find((a) => a.id === id) ?? null;
}

function demoAgentSummary(userId: string): DemoListing['users'] {
  const agent = DEMO_AGENTS.find((a) => a.id === userId);
  if (!agent) return undefined;
  return {
    id: agent.id,
    full_name: agent.full_name,
    phone: agent.phone,
    phone_visible: agent.phone_visible ?? false,
    email: agent.email,
    telegram_username: agent.telegram_username ?? null,
    avatar_url: agent.avatar_url,
    created_at: agent.created_at,
    last_active_at: agent.last_active_at,
    close_rate: agent.close_rate,
    total_posted: agent.total_posted,
    total_rented: agent.total_rented,
    total_sold: agent.total_sold,
    total_expired: agent.total_expired,
    avg_days_on_market: agent.avg_days_on_market,
  };
}

let demoCache: DemoListing[] | null = null;
let demoById: Map<string, DemoListing> | null = null;

/** Hand-curated demo listings plus ~800 generated ones, built once per app session. */
function allDemoListings(): DemoListing[] {
  if (!demoCache) {
    const generated = generateDemoListings().map((listing) => ({
      ...listing,
      users: demoAgentSummary(listing.user_id),
    }));
    // "Featured" is a real-seller placement; a demo must never be promoted above real listings.
    const all = [...ALL_DEMO_LISTINGS, ...generated].map((listing) => enrichListing({ ...listing, is_featured: false }));
    // The listings that can appear in normal use (see config.ts) each get their own photos.
    const photos = assignUniqueDemoPhotos(selectDemoListings([], all, 'auto'));
    demoCache = all.map((listing) => {
      const own = photos.get(listing.id);
      return own ? { ...listing, listing_photos: own } : listing;
    });
    demoById = new Map(demoCache.map((listing) => [listing.id, listing]));
  }
  return demoCache;
}

export function getDemoListings(): DemoListing[] {
  return allDemoListings();
}

export function getDemoListingById(id: string): DemoListing | null {
  allDemoListings();
  return demoById?.get(id) ?? null;
}

export function getDemoAgentListings(userId: string, status: 'active' | 'archived' = 'active'): DemoListing[] {
  return allDemoListings().filter((l) => l.user_id === userId && l.status === status);
}

export function getDemoPriceHistory(listingId: string): PriceHistoryEntry[] {
  return DEMO_PRICE_HISTORY.filter((h) => h.listing_id === listingId);
}

export function getDemoAreaMedianPrice(district: string, rooms: number, type: string): number | null {
  const matches = allDemoListings().filter(
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

