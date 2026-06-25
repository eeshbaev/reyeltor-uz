import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDemoListingById, getDemoListings } from '@/lib/demo';
import { fetchCbuUsdRate } from '@/lib/exchange/cbuRate';
import { syncCbuRateHistory } from '@/lib/exchange/cbuRateHistory';
import { applyClientFilters } from '@/lib/filters';
import {
  ensureMarketDataBootstrapped,
  hydrateMarketDataFromStorage,
  maybeRecordDistrictHistoryDaily,
  syncMarketCostsForRate,
  syncMarketData,
} from '@/lib/market/marketDataSync';
import { supabase, shouldUseDemoData } from '@/lib/supabase';
import { DEFAULT_FILTERS, type ListingFilters, type ListingWithPhotos, type MapListingPoint } from '@/types';

interface ListingsContextValue {
  allListings: ListingWithPhotos[];
  filteredListings: ListingWithPhotos[];
  mapPoints: MapListingPoint[];
  loading: boolean;
  filters: ListingFilters;
  setFilters: (filters: ListingFilters) => void;
  resetFilters: () => void;
  refetch: () => Promise<void>;
  isDemo: boolean;
  usdRate: number;
}

const ListingsContext = createContext<ListingsContextValue | null>(null);

function withListingPhotos(listings: ListingWithPhotos[]): ListingWithPhotos[] {
  return listings.map((listing) => {
    if (listing.listing_photos?.length) return listing;
    const demo = getDemoListingById(listing.id);
    if (demo?.listing_photos?.length) {
      return { ...listing, listing_photos: demo.listing_photos };
    }
    return listing;
  });
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const useDemo = shouldUseDemoData();
  const [allListings, setAllListings] = useState<ListingWithPhotos[]>(useDemo ? getDemoListings() : []);
  const [loading, setLoading] = useState(!useDemo);
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [usdRate, setUsdRate] = useState(12_017);
  const cacheRef = useRef<ListingWithPhotos[]>([]);

  const refreshMarketData = useCallback(
    async (listings: ListingWithPhotos[], force = false, rateOverride?: number) => {
      const rate = rateOverride ?? usdRate;
      await syncMarketData({
        force,
        usdRate: rate,
        listings: listings.map((listing) => ({
          district: listing.district,
          category: listing.category,
          type: listing.type,
          price: listing.price,
          area_m2: listing.area_m2,
        })),
      });
    },
    [usdRate],
  );

  const refreshUsdRate = useCallback(async () => {
    const rate = await fetchCbuUsdRate();
    setUsdRate(rate);
    await syncMarketCostsForRate(rate);
    if (cacheRef.current.length) {
      await refreshMarketData(cacheRef.current, false, rate);
    }
    return rate;
  }, [refreshMarketData]);

  useEffect(() => {
    (async () => {
      await hydrateMarketDataFromStorage();
      const rate = await fetchCbuUsdRate();
      await ensureMarketDataBootstrapped(rate);
      setUsdRate(rate);
      syncCbuRateHistory();
      await syncMarketCostsForRate(rate);
      await maybeRecordDistrictHistoryDaily();
    })();
  }, []);

  const fetchListings = useCallback(async () => {
    if (shouldUseDemoData()) {
      cacheRef.current = getDemoListings();
      setAllListings(cacheRef.current);
      setLoading(false);
      await refreshMarketData(cacheRef.current);
      return;
    }

    const { data, error } = await supabase.from('listings').select('*, listing_photos(*)').eq('status', 'active');
    if (!error && data && data.length > 0) {
      cacheRef.current = withListingPhotos(data as ListingWithPhotos[]);
      setAllListings(cacheRef.current);
    } else if (!error && (!data || data.length === 0)) {
      cacheRef.current = getDemoListings();
      setAllListings(cacheRef.current);
    }
    setLoading(false);
    await refreshMarketData(cacheRef.current);
  }, [refreshMarketData]);

  useEffect(() => {
    fetchListings();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchListings();
        refreshUsdRate();
        syncCbuRateHistory();
        void maybeRecordDistrictHistoryDaily();
      }
    });
    return () => sub.remove();
  }, [fetchListings, refreshUsdRate]);

  const filteredListings = useMemo(
    () => applyClientFilters(allListings, filters, usdRate),
    [allListings, filters, usdRate],
  );

  const mapPoints: MapListingPoint[] = useMemo(
    () =>
      filteredListings.map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        price: l.price,
        type: l.type,
        rooms: l.rooms,
        is_featured: l.is_featured,
      })),
    [filteredListings],
  );

  const value = useMemo(
    () => ({
      allListings,
      filteredListings,
      mapPoints,
      loading,
      filters,
      setFilters,
      resetFilters: () => setFilters(DEFAULT_FILTERS),
      refetch: fetchListings,
      isDemo: useDemo || allListings.some((l) => l.id.startsWith('l000000')),
      usdRate,
    }),
    [allListings, filteredListings, mapPoints, loading, filters, fetchListings, useDemo, usdRate],
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

export function useListingsCache() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error('useListingsCache must be used within ListingsProvider');
  return ctx;
}
