import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { attachListingPhotos } from '@/lib/attachListingPhotos';
import { listingCache } from '@/lib/cache/listingMemoryCache';
import { getDemoListings, isDemoId } from '@/lib/demo';
import { DEMO_INVENTORY_MODE, selectDemoListings } from '@/lib/demo/config';
import { fetchCbuUsdRate } from '@/lib/exchange/cbuRate';
import { syncCbuRateHistory } from '@/lib/exchange/cbuRateHistory';
import { applyClientFilters } from '@/lib/filters';
import { enrichListing } from '@/lib/listing';
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
  loadListingsIfNeeded: () => Promise<void>;
  upsertListing: (listing: ListingWithPhotos) => void;
  isDemo: boolean;
  /** True when the last attempt to load real listings failed (only demo listings, if any, are shown). */
  liveFetchFailed: boolean;
  usdRate: number;
}

const ListingsContext = createContext<ListingsContextValue | null>(null);

// OPTIMIZATION #1: Enrich listings once at fetch time
// This avoids re-enriching on every filter application
function withListingPhotos(listings: ListingWithPhotos[]): ListingWithPhotos[] {
  return attachListingPhotos(listings);
}

// Demo listings are already on screen while this loads, so a slow mobile connection can take its time.
/** Runs work once the UI is idle (replacement for InteractionManager.runAfterInteractions). */
function runAfterFirstFrames(task: () => void): { cancel: () => void } {
  let cancelled = false;
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  const timer = setTimeout(() => {
    if (cancelled) return;
    if (idle) idle(() => !cancelled && task());
    else task();
  }, 0);
  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
    },
  };
}

const LISTINGS_FETCH_TIMEOUT_MS = 20_000;
const MARKET_DATA_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function ListingsProvider({ children }: { children: ReactNode }) {
  const useDemo = shouldUseDemoData();
  // Start empty — populated in fetchListings (demo first, then live data when available).
  const [allListings, setAllListings] = useState<ListingWithPhotos[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>(DEFAULT_FILTERS);
  const [usdRate, setUsdRate] = useState(12_017);
  // Startup sync reads the latest rate without re-running when the rate changes.
  const usdRateRef = useRef(usdRate);
  usdRateRef.current = usdRate;
  const cacheRef = useRef<ListingWithPhotos[]>([]);
  const [liveFetchFailed, setLiveFetchFailed] = useState(false);

  const refreshMarketData = useCallback(
    async (listings: ListingWithPhotos[], force = false, rateOverride?: number) => {
      const rate = rateOverride ?? usdRate;
      await syncMarketData({
        force,
        usdRate: rate,
        // Demo listings must never shape district averages.
        listings: listings.filter((listing) => !isDemoId(listing.id)).map((listing) => ({
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
    let isMounted = true;
    const abortController = new AbortController();

    // After the first frames are drawn (InteractionManager was removed in React Native 0.82).
    const interactionTask = runAfterFirstFrames(() => {
      void (async () => {
        try {
          if (!isMounted) return;
          await hydrateMarketDataFromStorage();

          if (!isMounted) return;
          await ensureMarketDataBootstrapped(usdRateRef.current);

          if (!isMounted) return;
          await Promise.all([
            syncCbuRateHistory().catch((error) => {
              console.warn('Failed to sync CBU rate history:', error);
            }),
            syncMarketCostsForRate(usdRateRef.current).catch((error) => {
              console.warn('Failed to sync market costs:', error);
            }),
            maybeRecordDistrictHistoryDaily().catch((error) => {
              console.warn('Failed to record district history:', error);
            }),
          ]);
        } catch (error) {
          console.error('Market data initialization failed:', error);
        }
      })();
    });

    const backgroundTimer = setTimeout(async () => {
      if (!isMounted) return;
      try {
        const rate = await fetchCbuUsdRate();
        if (isMounted) {
          setUsdRate(rate);
          await syncMarketCostsForRate(rate);
          if (isMounted && cacheRef.current.length) {
            await refreshMarketData(cacheRef.current, false, rate);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch CBU rate in background:', error);
      }
    }, 2_000);

    return () => {
      isMounted = false;
      abortController.abort();
      interactionTask.cancel();
      clearTimeout(backgroundTimer);
    };
  }, [refreshMarketData]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const demoAllowed = DEMO_INVENTORY_MODE !== 'off';

    try {
      if (shouldUseDemoData()) {
        // Supabase not configured (local development).
        cacheRef.current = demoAllowed ? getDemoListings() : [];
        setAllListings(cacheRef.current);
        return;
      }

      // Paint labeled demo inventory immediately so the map is never blank while loading.
      if (demoAllowed && cacheRef.current.length === 0) {
        cacheRef.current = getDemoListings();
        setAllListings(cacheRef.current);
      }

      const fetchLive = supabase
        .from('listings')
        .select('*, listing_photos(*)')
        .eq('status', 'active');

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Listings fetch timeout')), LISTINGS_FETCH_TIMEOUT_MS);
      });

      const { data, error } = await Promise.race([fetchLive, timeout]);
      if (error) throw error;

      const real = withListingPhotos((data ?? []) as ListingWithPhotos[]);
      real.forEach((listing) => listingCache.set(listing));
      // Demos fill only the districts where real supply is still thin; real listings come first.
      cacheRef.current = [...real, ...selectDemoListings(real, getDemoListings())];
      setAllListings(cacheRef.current);
      setLiveFetchFailed(false);
      setTimeout(() => refreshMarketData(cacheRef.current), 1000);
    } catch (err) {
      // Never pretend demo data is live: keep whatever real listings we had, and flag the failure
      // so the map can say that only demo listings are shown.
      console.warn('Listings fetch failed:', err);
      setLiveFetchFailed(true);
      const realKept = cacheRef.current.filter((listing) => !isDemoId(listing.id));
      cacheRef.current = [...realKept, ...selectDemoListings(realKept, getDemoListings())];
      setAllListings(cacheRef.current);
    } finally {
      setLoading(false);
    }
  }, [refreshMarketData]);

  // Lazy-load listings on first navigation to map
  const [listingsLoaded, setListingsLoaded] = useState(false);

  const loadListingsIfNeeded = useCallback(async () => {
    if (listingsLoaded || loading) return;
    try {
      await fetchListings();
    } finally {
      setListingsLoaded(true);
    }
  }, [fetchListings, listingsLoaded, loading]);

  const upsertListing = useCallback((listing: ListingWithPhotos) => {
    const enriched = enrichListing(listing);
    cacheRef.current = [enriched, ...cacheRef.current.filter((item) => item.id !== enriched.id)];
    cacheRef.current.forEach((item) => listingCache.set(item));
    setAllListings([...cacheRef.current]);
  }, []);

  // Use ref to capture listingsLoaded without recreating effect
  const listingsLoadedRef = useRef(listingsLoaded);
  useEffect(() => {
    listingsLoadedRef.current = listingsLoaded;
  }, [listingsLoaded]);

  // Debounce market data refresh on app resume to prevent battery drain
  const lastMarketDataSyncRef = useRef(0);

  useEffect(() => {
    // Don't load listings on app startup - lazy load when needed
    let isMounted = true;
    const abortController = new AbortController();

    const onChange = async (state: AppStateStatus) => {
      if (state !== 'active' || !isMounted) return;

      try {
        if (listingsLoadedRef.current) {
          // Refresh if already loaded
          await fetchListings();
          if (!isMounted) return;
        }

        // Refresh CBU spot rate on every resume (cached for 24h inside fetchCbuUsdRate).
        await refreshUsdRate();
        if (!isMounted) return;

        // Debounce heavier market-data sync.
        const now = Date.now();
        if (now - lastMarketDataSyncRef.current >= MARKET_DATA_SYNC_INTERVAL) {
          lastMarketDataSyncRef.current = now;
          if (cacheRef.current.length) {
            await refreshMarketData(cacheRef.current, false);
          }
        }

        // Daily CBU history sync (skips if already synced today).
        await syncCbuRateHistory().catch((error) => {
          console.warn('Failed to sync CBU rate history on resume:', error);
        });

        if (!isMounted) return;
        await maybeRecordDistrictHistoryDaily().catch(error => {
          console.warn('Failed to record district history on resume:', error);
        });
      } catch (error) {
        console.warn('Error during app resume:', error);
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => {
      isMounted = false;
      abortController.abort();
      sub.remove();
    };
  }, [fetchListings, refreshMarketData, refreshUsdRate]);

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
      loadListingsIfNeeded,
      upsertListing,
      isDemo: useDemo || allListings.some((l) => isDemoId(l.id)),
      liveFetchFailed,
      usdRate,
    }),
    [allListings, filteredListings, mapPoints, loading, filters, fetchListings, useDemo, usdRate, loadListingsIfNeeded, upsertListing, liveFetchFailed],
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

export function useListingsCache() {
  const ctx = useContext(ListingsContext);
  if (!ctx) throw new Error('useListingsCache must be used within ListingsProvider');
  return ctx;
}
