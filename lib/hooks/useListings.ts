import { attachListingPhotos } from '@/lib/attachListingPhotos';
import {
  getDemoAgentListings,
  getDemoAreaMedianPrice,
  getDemoListingById,
  getDemoPriceHistory,
  isDemoId,
} from '@/lib/demo';
import { fetchPublicProfile } from '@/lib/profile/publicProfiles';
import { shouldUseDemoData, supabase } from '@/lib/supabase';
import type { ListingWithPhotos, PriceHistoryEntry } from '@/types';

export async function fetchListingById(id: string): Promise<ListingWithPhotos | null> {
  if (isDemoId(id)) return getDemoListingById(id);

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('id', id)
      .single();

    if (error || !data) return getDemoListingById(id);
    const listing = attachListingPhotos([data as ListingWithPhotos])[0];
    if (!listing) return getDemoListingById(id);
    // Seller details come from public_profiles (phone only if the seller shows it).
    const seller = await fetchPublicProfile(listing.user_id);
    return seller ? { ...listing, users: seller } : listing;
  } catch (err) {
    console.error('Unexpected error fetching listing:', err);
    return getDemoListingById(id);
  }
}

export async function fetchAgentListings(
  userId: string,
  status: 'active' | 'archived' = 'active',
): Promise<ListingWithPhotos[]> {
  if (isDemoId(userId)) return getDemoAgentListings(userId, status);

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('user_id', userId)
      .eq('status', status)
      .order('posted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch agent listings:', error.message);
      return getDemoAgentListings(userId, status);
    }

    return attachListingPhotos((data ?? []) as ListingWithPhotos[]);
  } catch (err) {
    console.error('Unexpected error fetching agent listings:', err);
    return getDemoAgentListings(userId, status);
  }
}

export async function fetchActiveListingCount(userId: string): Promise<number> {
  if (isDemoId(userId)) return getDemoAgentListings(userId, 'active').length;

  try {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to fetch active listing count:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error('Unexpected error fetching active listing count:', err);
    return 0;
  }
}

export async function fetchAreaMedianPrice(
  district: string,
  rooms: number,
  type: string,
): Promise<number | null> {
  if (shouldUseDemoData()) return getDemoAreaMedianPrice(district, rooms, type);

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('price')
      .eq('district', district)
      .eq('rooms', rooms)
      .eq('type', type)
      .eq('status', 'active');

    if (error || !data || data.length === 0) {
      return getDemoAreaMedianPrice(district, rooms, type);
    }

    const prices = data.map((row) => row.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  } catch (err) {
    console.error('Unexpected error fetching area median price:', err);
    return getDemoAreaMedianPrice(district, rooms, type);
  }
}

export async function fetchPriceHistory(listingId: string): Promise<PriceHistoryEntry[]> {
  if (isDemoId(listingId)) return getDemoPriceHistory(listingId);

  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('listing_id', listingId)
      .order('changed_at', { ascending: false });

    if (error || !data?.length) return getDemoPriceHistory(listingId);
    return data as PriceHistoryEntry[];
  } catch (err) {
    console.error('Unexpected error fetching price history:', err);
    return getDemoPriceHistory(listingId);
  }
}
