import { useCallback, useEffect, useState } from 'react';
import { applyClientFilters } from '@/lib/filters';
import {
  getDemoAgentListings,
  getDemoAreaMedianPrice,
  getDemoListingById,
  getDemoListings,
  getDemoPriceHistory,
  isDemoId,
} from '@/lib/demo';
import { shouldUseDemoData, supabase } from '@/lib/supabase';
import type { Listing, ListingFilters, ListingWithPhotos, MapListingPoint } from '@/types';

export function useListings(filters: ListingFilters) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (shouldUseDemoData()) {
      const filtered = applyClientFilters(getDemoListings(), filters);
      setListings(filtered);
      setLoading(false);
      return;
    }

    let query = supabase.from('listings').select('*').eq('status', 'active');

    if (filters.districts.length > 0) query = query.in('district', filters.districts);

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setListings([]);
    } else {
      const filtered = applyClientFilters((data ?? []) as Listing[], filters);
      setListings(filtered);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const mapPoints: MapListingPoint[] = listings.map((l) => ({
    id: l.id,
    lat: l.lat,
    lng: l.lng,
    price: l.price,
    type: l.type,
    rooms: l.rooms,
  }));

  return { listings, mapPoints, loading, error, refetch: fetchListings };
}

export async function fetchListingById(id: string): Promise<ListingWithPhotos | null> {
  if (isDemoId(id)) return getDemoListingById(id);

  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*), users(id, full_name, phone, telegram_username, created_at, last_active_at, close_rate, total_posted, total_rented, total_sold, total_expired, avg_days_on_market)')
    .eq('id', id)
    .single();

  if (error || !data) return getDemoListingById(id);
  return data as ListingWithPhotos;
}

export async function fetchAgentListings(userId: string, status: 'active' | 'archived' = 'active') {
  if (isDemoId(userId)) return getDemoAgentListings(userId, status);

  const { data } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('user_id', userId)
    .eq('status', status)
    .order('posted_at', { ascending: false });
  return (data ?? []) as ListingWithPhotos[];
}

export async function fetchActiveListingCount(userId: string): Promise<number> {
  if (isDemoId(userId)) return getDemoAgentListings(userId, 'active').length;

  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');
  return count ?? 0;
}

export async function fetchAreaMedianPrice(
  district: string,
  rooms: number,
  type: string,
): Promise<number | null> {
  if (shouldUseDemoData()) return getDemoAreaMedianPrice(district, rooms, type);

  const { data } = await supabase
    .from('listings')
    .select('price')
    .eq('district', district)
    .eq('rooms', rooms)
    .eq('type', type)
    .eq('status', 'active');

  if (!data || data.length === 0) return getDemoAreaMedianPrice(district, rooms, type);
  const prices = data.map((r) => r.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
}

export async function fetchPriceHistory(listingId: string) {
  if (isDemoId(listingId)) return getDemoPriceHistory(listingId);

  const { data } = await supabase
    .from('price_history')
    .select('*')
    .eq('listing_id', listingId)
    .order('changed_at', { ascending: false });
  return data ?? getDemoPriceHistory(listingId);
}
