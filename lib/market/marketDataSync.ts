import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCbuUsdRate } from '@/lib/exchange/cbuRate';
import {
  DEFAULT_ANNUAL_APPRECIATION_PCT,
  DEFAULT_ANNUAL_RENT_INCREASE_PCT,
  DEFAULT_COMMERCIAL_DISTRICT_MARKET,
  DEFAULT_RESIDENTIAL_DISTRICT_MARKET,
  FURNITURE_PER_ROOM_USD,
  MIN_LISTINGS_PER_DISTRICT_METRIC,
  MOVING_FURNITURE_PER_ROOM_USD,
  MOVING_SERVICE_USD,
  RENOVATION_COST_PER_M2_USD,
  TECHNICAL_INSPECTION_USD,
  type CommercialDistrictMarketAverages,
  type DistrictMarketAverages,
} from '@/lib/market/defaultMarketData';
import {
  hydrateDistrictPriceHistory,
  recordDistrictPriceHistory,
  seedDistrictPriceHistory,
} from '@/lib/market/districtPriceHistory';
import {
  createDefaultMarketSnapshot,
  getMarketDataSnapshot,
  setMarketDataSnapshot,
  type MarketDataSnapshot,
} from '@/lib/market/marketDataStore';
import type { RenovationLevel } from '@/lib/tools/renovationRates';

const STORAGE_KEY = '@reyeltor/market-data-snapshot';
/** District averages & macro rates: refresh weekly. CBU spot rate syncs daily separately. */
export const MARKET_DATA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ListingMarketInput {
  district: string;
  category?: string | null;
  type: string;
  price: number;
  area_m2: number;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function pickMetric(
  computed: number | null,
  fallback: number,
  count: number,
): { value: number; usedListings: boolean } {
  if (computed === null || count < MIN_LISTINGS_PER_DISTRICT_METRIC) {
    return { value: fallback, usedListings: false };
  }
  return { value: round1(computed), usedListings: true };
}

function computeDistrictMarkets(
  listings: ListingMarketInput[],
  usdRate: number,
): {
  residential: Record<string, DistrictMarketAverages>;
  commercial: Record<string, CommercialDistrictMarketAverages>;
  districtSource: MarketDataSnapshot['districtSource'];
} {
  const rentBuckets = new Map<string, number[]>();
  const saleBuckets = new Map<string, number[]>();
  const leaseBuckets = new Map<string, number[]>();
  const commercialSaleBuckets = new Map<string, number[]>();

  for (const listing of listings) {
    if (!listing.district || listing.area_m2 <= 0 || listing.price <= 0) continue;
    const perSqmUzs = listing.price / listing.area_m2;
    const perSqmUsd = perSqmUzs / usdRate;
    const category = listing.category ?? 'residential';

    if (category === 'commercial') {
      if (listing.type === 'lease') {
        const bucket = leaseBuckets.get(listing.district) ?? [];
        bucket.push(perSqmUsd);
        leaseBuckets.set(listing.district, bucket);
      } else if (listing.type === 'buy') {
        const bucket = commercialSaleBuckets.get(listing.district) ?? [];
        bucket.push(perSqmUsd);
        commercialSaleBuckets.set(listing.district, bucket);
      }
      continue;
    }

    if (listing.type === 'rent') {
      const bucket = rentBuckets.get(listing.district) ?? [];
      bucket.push(perSqmUsd);
      rentBuckets.set(listing.district, bucket);
    } else if (listing.type === 'buy') {
      const bucket = saleBuckets.get(listing.district) ?? [];
      bucket.push(perSqmUsd);
      saleBuckets.set(listing.district, bucket);
    }
  }

  let usedListingMetrics = 0;
  let totalMetrics = 0;

  const residential: Record<string, DistrictMarketAverages> = {};
  for (const [district, fallback] of Object.entries(DEFAULT_RESIDENTIAL_DISTRICT_MARKET)) {
    const rentPick = pickMetric(median(rentBuckets.get(district) ?? []), fallback.rentPerSqmUsd, rentBuckets.get(district)?.length ?? 0);
    const salePick = pickMetric(median(saleBuckets.get(district) ?? []), fallback.salePerSqmUsd, saleBuckets.get(district)?.length ?? 0);
    residential[district] = { rentPerSqmUsd: rentPick.value, salePerSqmUsd: salePick.value };
    totalMetrics += 2;
    if (rentPick.usedListings) usedListingMetrics += 1;
    if (salePick.usedListings) usedListingMetrics += 1;
  }

  const commercial: Record<string, CommercialDistrictMarketAverages> = {};
  for (const [district, fallback] of Object.entries(DEFAULT_COMMERCIAL_DISTRICT_MARKET)) {
    const leasePick = pickMetric(median(leaseBuckets.get(district) ?? []), fallback.leasePerSqmUsd, leaseBuckets.get(district)?.length ?? 0);
    const salePick = pickMetric(
      median(commercialSaleBuckets.get(district) ?? []),
      fallback.salePerSqmUsd,
      commercialSaleBuckets.get(district)?.length ?? 0,
    );
    commercial[district] = { leasePerSqmUsd: leasePick.value, salePerSqmUsd: salePick.value };
    totalMetrics += 2;
    if (leasePick.usedListings) usedListingMetrics += 1;
    if (salePick.usedListings) usedListingMetrics += 1;
  }

  const districtSource: MarketDataSnapshot['districtSource'] =
    usedListingMetrics === 0 ? 'default' : usedListingMetrics === totalMetrics ? 'listings' : 'blended';

  return { residential, commercial, districtSource };
}

function buildFurniturePerRoom(usdRate: number): Record<RenovationLevel, number> {
  return {
    cosmetic: Math.round(FURNITURE_PER_ROOM_USD.cosmetic * usdRate),
    basic: Math.round(FURNITURE_PER_ROOM_USD.basic * usdRate),
    medium: Math.round(FURNITURE_PER_ROOM_USD.medium * usdRate),
    premium: Math.round(FURNITURE_PER_ROOM_USD.premium * usdRate),
    luxury: Math.round(FURNITURE_PER_ROOM_USD.luxury * usdRate),
  };
}

function buildRenovationCosts(usdRate: number): Record<RenovationLevel, number> {
  return {
    cosmetic: Math.round(RENOVATION_COST_PER_M2_USD.cosmetic * usdRate),
    basic: Math.round(RENOVATION_COST_PER_M2_USD.basic * usdRate),
    medium: Math.round(RENOVATION_COST_PER_M2_USD.medium * usdRate),
    premium: Math.round(RENOVATION_COST_PER_M2_USD.premium * usdRate),
    luxury: Math.round(RENOVATION_COST_PER_M2_USD.luxury * usdRate),
  };
}

function computeMacroRates(
  residential: Record<string, DistrictMarketAverages>,
  previous: MarketDataSnapshot | null,
): { annualAppreciationPct: number; annualRentIncreasePct: number } {
  const saleMedians = Object.values(residential).map((row) => row.salePerSqmUsd);
  const rentMedians = Object.values(residential).map((row) => row.rentPerSqmUsd);
  const currentSale = median(saleMedians);
  const currentRent = median(rentMedians);

  if (!previous || currentSale === null || currentRent === null) {
    return {
      annualAppreciationPct: DEFAULT_ANNUAL_APPRECIATION_PCT,
      annualRentIncreasePct: DEFAULT_ANNUAL_RENT_INCREASE_PCT,
    };
  }

  const prevSaleValues = Object.values(previous.residential).map((row) => row.salePerSqmUsd);
  const prevRentValues = Object.values(previous.residential).map((row) => row.rentPerSqmUsd);
  const prevSale = median(prevSaleValues);
  const prevRent = median(prevRentValues);

  const weeksSince = Math.max(1, (Date.now() - previous.updatedAt) / (7 * 24 * 60 * 60 * 1000));
  const annualFactor = 52 / weeksSince;

  let annualAppreciationPct = DEFAULT_ANNUAL_APPRECIATION_PCT;
  if (prevSale && prevSale > 0) {
    const weeklyChange = ((currentSale - prevSale) / prevSale) * 100;
    annualAppreciationPct = Math.min(25, Math.max(-5, weeklyChange * annualFactor));
  }

  let annualRentIncreasePct = DEFAULT_ANNUAL_RENT_INCREASE_PCT;
  if (prevRent && prevRent > 0) {
    const weeklyChange = ((currentRent - prevRent) / prevRent) * 100;
    annualRentIncreasePct = Math.min(20, Math.max(0, weeklyChange * annualFactor));
  }

  return {
    annualAppreciationPct: Math.round(annualAppreciationPct * 10) / 10,
    annualRentIncreasePct: Math.round(annualRentIncreasePct * 10) / 10,
  };
}

async function readStoredSnapshot(): Promise<MarketDataSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketDataSnapshot;
  } catch {
    return null;
  }
}

async function writeStoredSnapshot(snapshot: MarketDataSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export async function hydrateMarketDataFromStorage(): Promise<void> {
  await hydrateDistrictPriceHistory();
  const stored = await readStoredSnapshot();
  if (stored?.residential && stored.commercial) {
    if (!stored.furniturePerRoomUzs) {
      stored.furniturePerRoomUzs = buildFurniturePerRoom(stored.usdRateAtSync);
    }
    setMarketDataSnapshot(stored);
  }
}

async function syncDistrictPriceHistory(snapshot: MarketDataSnapshot, force?: boolean): Promise<void> {
  await seedDistrictPriceHistory(snapshot);
  await recordDistrictPriceHistory(snapshot, { force });
}

/** Record today's district snapshot when app opens (at most once per day). */
export async function maybeRecordDistrictHistoryDaily(): Promise<void> {
  const snapshot = getMarketDataSnapshot();
  if (!snapshot.updatedAt) return;
  await recordDistrictPriceHistory(snapshot);
}

export async function syncMarketData(options?: {
  force?: boolean;
  listings?: ListingMarketInput[];
  usdRate?: number;
}): Promise<{ updated: boolean; fromCache: boolean }> {
  const current = getMarketDataSnapshot();
  const isFresh = current.updatedAt && Date.now() - current.updatedAt < MARKET_DATA_TTL_MS;

  if (!options?.force && isFresh) {
    return { updated: false, fromCache: true };
  }

  const usdRate = options?.usdRate ?? (await fetchCbuUsdRate());
  const listings = options?.listings ?? [];
  const previous = current.updatedAt ? current : await readStoredSnapshot();

  const { residential, commercial, districtSource } = computeDistrictMarkets(listings, usdRate);
  const macro = computeMacroRates(residential, previous);

  const snapshot: MarketDataSnapshot = {
    updatedAt: Date.now(),
    usdRateAtSync: usdRate,
    residential,
    commercial,
    renovationCostPerM2Uzs: buildRenovationCosts(usdRate),
    movingFurniturePerRoomUzs: Math.round(MOVING_FURNITURE_PER_ROOM_USD * usdRate),
    movingServiceUzs: Math.round(MOVING_SERVICE_USD * usdRate),
    technicalInspectionUzs: Math.round(TECHNICAL_INSPECTION_USD * usdRate),
    furniturePerRoomUzs: buildFurniturePerRoom(usdRate),
    macro,
    districtSource,
  };

  setMarketDataSnapshot(snapshot);
  await writeStoredSnapshot(snapshot);
  await syncDistrictPriceHistory(snapshot, options?.force);
  return { updated: true, fromCache: false };
}

/** Re-index UZS tool costs when CBU rate changes (daily), without recomputing district medians. */
export async function syncMarketCostsForRate(usdRate: number): Promise<void> {
  const current = getMarketDataSnapshot();
  const next: MarketDataSnapshot = {
    ...current,
    usdRateAtSync: usdRate,
    renovationCostPerM2Uzs: buildRenovationCosts(usdRate),
    movingFurniturePerRoomUzs: Math.round(MOVING_FURNITURE_PER_ROOM_USD * usdRate),
    movingServiceUzs: Math.round(MOVING_SERVICE_USD * usdRate),
    technicalInspectionUzs: Math.round(TECHNICAL_INSPECTION_USD * usdRate),
    furniturePerRoomUzs: buildFurniturePerRoom(usdRate),
  };
  setMarketDataSnapshot(next);
  await writeStoredSnapshot(next);
}

export async function ensureMarketDataBootstrapped(usdRate: number): Promise<void> {
  const stored = await readStoredSnapshot();
  if (stored) {
    setMarketDataSnapshot(stored);
    await syncDistrictPriceHistory(stored);
    return;
  }
  const snapshot = createDefaultMarketSnapshot(usdRate);
  setMarketDataSnapshot(snapshot);
  await syncDistrictPriceHistory(snapshot, true);
}
