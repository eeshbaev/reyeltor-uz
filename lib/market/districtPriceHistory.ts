import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_ANNUAL_APPRECIATION_PCT,
  DEFAULT_ANNUAL_RENT_INCREASE_PCT,
} from '@/lib/market/defaultMarketData';
import type { MarketDataSnapshot } from '@/lib/market/marketDataStore';

const STORAGE_KEY = '@reyeltor/district-price-history';
const WEEKS_TO_KEEP = 60;
const WEEKS_IN_YEAR = 52;
/** Record at most one snapshot per calendar day. */
export const DISTRICT_HISTORY_RECORD_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface DistrictHistoryPoint {
  date: string;
  category: 'residential' | 'commercial';
  district: string;
  rentPerSqmUsd: number;
  salePerSqmUsd: number;
}

export interface DistrictTrendPoint {
  date: string;
  rent: number;
  sale: number;
}

interface DistrictHistoryStore {
  updatedAt: number;
  lastRecordedAt: number;
  points: DistrictHistoryPoint[];
}

let memoryStore: DistrictHistoryStore | null = null;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function weekStartsForYear(): string[] {
  const dates: string[] = [];
  const end = new Date();
  for (let week = WEEKS_IN_YEAR - 1; week >= 0; week -= 1) {
    dates.push(toIsoDate(addDays(end, -week * 7)));
  }
  return dates;
}

async function readStore(): Promise<DistrictHistoryStore | null> {
  if (memoryStore) return memoryStore;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DistrictHistoryStore;
    if (!Array.isArray(parsed.points)) return null;
    memoryStore = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function writeStore(store: DistrictHistoryStore): Promise<void> {
  memoryStore = store;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function monthlyGrowthFromAnnual(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

function synthesizeHistory(
  district: string,
  category: 'residential' | 'commercial',
  currentRent: number,
  currentSale: number,
  saleGrowthAnnual: number,
  rentGrowthAnnual: number,
): DistrictHistoryPoint[] {
  const saleMonthly = monthlyGrowthFromAnnual(saleGrowthAnnual);
  const rentMonthly = monthlyGrowthFromAnnual(rentGrowthAnnual);
  const weekDates = weekStartsForYear();
  const points: DistrictHistoryPoint[] = [];

  weekDates.forEach((date, index) => {
    const monthsAgo = ((weekDates.length - 1 - index) * 7) / 30.44;
    const sale = currentSale / Math.pow(1 + saleMonthly, monthsAgo);
    const rent = currentRent / Math.pow(1 + rentMonthly, monthsAgo);
    points.push({
      date,
      category,
      district,
      rentPerSqmUsd: Math.round(rent * 10) / 10,
      salePerSqmUsd: Math.round(sale),
    });
  });

  return points;
}

export async function hydrateDistrictPriceHistory(): Promise<void> {
  await readStore();
}

export async function seedDistrictPriceHistory(snapshot: MarketDataSnapshot): Promise<void> {
  const existing = await readStore();
  if (existing && existing.points.length >= WEEKS_IN_YEAR) return;

  const seeded: DistrictHistoryPoint[] = [];
  const saleGrowth = snapshot.macro.annualAppreciationPct || DEFAULT_ANNUAL_APPRECIATION_PCT;
  const rentGrowth = snapshot.macro.annualRentIncreasePct || DEFAULT_ANNUAL_RENT_INCREASE_PCT;

  for (const [district, row] of Object.entries(snapshot.residential)) {
    seeded.push(...synthesizeHistory(district, 'residential', row.rentPerSqmUsd, row.salePerSqmUsd, saleGrowth, rentGrowth));
  }
  for (const [district, row] of Object.entries(snapshot.commercial)) {
    seeded.push(
      ...synthesizeHistory(district, 'commercial', row.leasePerSqmUsd, row.salePerSqmUsd, saleGrowth, rentGrowth),
    );
  }

  const store: DistrictHistoryStore = {
    updatedAt: Date.now(),
    lastRecordedAt: Date.now(),
    points: seeded,
  };
  await writeStore(store);
}

export async function recordDistrictPriceHistory(
  snapshot: MarketDataSnapshot,
  options?: { force?: boolean },
): Promise<void> {
  const store = (await readStore()) ?? {
    updatedAt: 0,
    lastRecordedAt: 0,
    points: [] as DistrictHistoryPoint[],
  };

  const today = toIsoDate(new Date());
  const lastDay = store.lastRecordedAt ? toIsoDate(new Date(store.lastRecordedAt)) : '';
  if (!options?.force && lastDay === today) return;

  const date = today;
  const nextPoints = store.points.filter((point) => point.date !== date);

  for (const [district, row] of Object.entries(snapshot.residential)) {
    nextPoints.push({
      date,
      category: 'residential',
      district,
      rentPerSqmUsd: row.rentPerSqmUsd,
      salePerSqmUsd: row.salePerSqmUsd,
    });
  }
  for (const [district, row] of Object.entries(snapshot.commercial)) {
    nextPoints.push({
      date,
      category: 'commercial',
      district,
      rentPerSqmUsd: row.leasePerSqmUsd,
      salePerSqmUsd: row.salePerSqmUsd,
    });
  }

  const cutoff = toIsoDate(addDays(new Date(), -WEEKS_TO_KEEP * 7));
  const trimmed = nextPoints.filter((point) => point.date >= cutoff);

  await writeStore({
    updatedAt: Date.now(),
    lastRecordedAt: Date.now(),
    points: trimmed,
  });
}

function pickWeeklySeries(
  points: DistrictHistoryPoint[],
  district: string,
  category: 'residential' | 'commercial',
): Map<string, DistrictHistoryPoint> {
  const filtered = points
    .filter((point) => point.district === district && point.category === category)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byWeek = new Map<string, DistrictHistoryPoint>();
  for (const point of filtered) {
    byWeek.set(point.date, point);
  }
  return byWeek;
}

export async function getDistrictTwelveMonthTrend(
  district: string,
  category: 'residential' | 'commercial',
  snapshot: MarketDataSnapshot,
): Promise<DistrictTrendPoint[]> {
  const store = await readStore();
  const weekDates = weekStartsForYear();
  const byWeek = pickWeeklySeries(store?.points ?? [], district, category);

  let currentRent: number;
  let currentSale: number;
  if (category === 'residential') {
    const row = snapshot.residential[district];
    if (!row) return [];
    currentRent = row.rentPerSqmUsd;
    currentSale = row.salePerSqmUsd;
  } else {
    const row = snapshot.commercial[district];
    if (!row) return [];
    currentRent = row.leasePerSqmUsd;
    currentSale = row.salePerSqmUsd;
  }

  const saleGrowth = snapshot.macro.annualAppreciationPct || DEFAULT_ANNUAL_APPRECIATION_PCT;
  const rentGrowth = snapshot.macro.annualRentIncreasePct || DEFAULT_ANNUAL_RENT_INCREASE_PCT;
  const saleMonthly = monthlyGrowthFromAnnual(saleGrowth);
  const rentMonthly = monthlyGrowthFromAnnual(rentGrowth);

  return weekDates.map((date, index) => {
    const recorded = byWeek.get(date);
    if (recorded) {
      return { date, rent: recorded.rentPerSqmUsd, sale: recorded.salePerSqmUsd };
    }

    const monthsAgo = ((weekDates.length - 1 - index) * 7) / 30.44;
    return {
      date,
      rent: Math.round((currentRent / Math.pow(1 + rentMonthly, monthsAgo)) * 10) / 10,
      sale: Math.round(currentSale / Math.pow(1 + saleMonthly, monthsAgo)),
    };
  });
}

export function formatTrendDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}
