import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchCbuJson,
  HISTORY_TIMEOUT_MS,
  resolveDateLocale,
  rowToPoint,
  todayKey,
  toLocalIsoDate,
} from '@/lib/exchange/cbuFetch';
import { persistCbuSpot } from '@/lib/exchange/cbuRate';
import { getBundledRatePoints } from '@/lib/tools/currencyHistory';

const STORAGE_KEY = '@reyeltor/cbu-usd-history-v2';
const LEGACY_STORAGE_KEY = '@reyeltor/cbu-usd-history';
const HISTORY_DAYS = 365;

export interface CbuRatePoint {
  date: string;
  rate: number;
}

export type CurrencyDataSource = 'network' | 'storage' | 'bundled';

interface StoredHistory {
  updatedAt: number;
  syncedOn: string;
  lastAttemptAt?: number;
  points: CbuRatePoint[];
}

const NETWORK_RETRY_MS = 30 * 60 * 1000;

let memoryCache: StoredHistory | null = null;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dedupePoints(points: CbuRatePoint[]): CbuRatePoint[] {
  const byDate = new Map<string, CbuRatePoint>();
  for (const point of points) {
    byDate.set(point.date, point);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function trimToOneYear(points: CbuRatePoint[]): CbuRatePoint[] {
  const cutoffIso = toLocalIsoDate(addDays(new Date(), -HISTORY_DAYS));
  return dedupePoints(points.filter((point) => point.date >= cutoffIso));
}

function getMonthlyDatesForYear(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let monthOffset = 11; monthOffset >= 0; monthOffset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15);
    dates.push(toLocalIsoDate(date));
  }
  dates.push(toLocalIsoDate(today));
  return [...new Set(dates)];
}

function isLegacySeed(points: CbuRatePoint[]): boolean {
  return points.length === 10 && points[0]?.date === '2024-01-15';
}

async function readStoredHistory(): Promise<StoredHistory | null> {
  if (memoryCache) return memoryCache;

  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredHistory;
    if (!Array.isArray(parsed.points) || parsed.points.length < 2 || isLegacySeed(parsed.points)) {
      return null;
    }

    memoryCache = {
      ...parsed,
      syncedOn: parsed.syncedOn ?? todayKey(),
      points: trimToOneYear(parsed.points),
    };
    return memoryCache;
  } catch {
    return null;
  }
}

async function writeStoredHistory(
  points: CbuRatePoint[],
  syncedOn = todayKey(),
  lastAttemptAt?: number,
): Promise<StoredHistory> {
  const payload: StoredHistory = {
    updatedAt: Date.now(),
    syncedOn,
    ...(lastAttemptAt != null ? { lastAttemptAt } : {}),
    points: trimToOneYear(points),
  };
  memoryCache = payload;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  return payload;
}

export async function fetchLatestCbuPoint(): Promise<CbuRatePoint | null> {
  try {
    const rows = await fetchCbuJson('/');
    return rowToPoint(rows[0]);
  } catch {
    return null;
  }
}

async function fetchMonthlyPoints(): Promise<CbuRatePoint[]> {
  const dates = getMonthlyDatesForYear();
  const collected: CbuRatePoint[] = [];
  const batchSize = 4;

  for (let index = 0; index < dates.length; index += batchSize) {
    const batch = dates.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map(async (date) => {
        try {
          const rows = await fetchCbuJson(`/${date}/`, HISTORY_TIMEOUT_MS);
          return rowToPoint(rows[0]);
        } catch {
          return null;
        }
      }),
    );
    for (const point of results) {
      if (point) collected.push(point);
    }
  }

  return dedupePoints(collected);
}

export async function loadCbuRateHistory(): Promise<CbuRatePoint[]> {
  const stored = await readStoredHistory();
  if (stored?.points.length) return stored.points;
  return getBundledRatePoints();
}

function cacheFallback(stored: StoredHistory | null): {
  points: CbuRatePoint[];
  updatedAt: number | null;
  source: CurrencyDataSource;
  fromCache: boolean;
} {
  if (stored && stored.points.length >= 2) {
    return {
      points: stored.points,
      updatedAt: stored.updatedAt,
      source: 'storage',
      fromCache: true,
    };
  }

  return {
    points: trimToOneYear(getBundledRatePoints()),
    updatedAt: null,
    source: 'bundled',
    fromCache: true,
  };
}

export async function loadCurrencyData(
  force = false,
  options?: { cacheOnly?: boolean },
): Promise<{
  points: CbuRatePoint[];
  updatedAt: number | null;
  source: CurrencyDataSource;
  fromCache: boolean;
}> {
  const cacheOnly = options?.cacheOnly ?? false;
  const stored = await readStoredHistory();
  const hasFreshStorage = stored && !force && stored.syncedOn === todayKey();

  if (hasFreshStorage) {
    return {
      points: stored.points,
      updatedAt: stored.updatedAt,
      source: 'storage',
      fromCache: false,
    };
  }

  if (cacheOnly) {
    return cacheFallback(stored);
  }

  if (stored && stored.points.length >= 2 && !force) {
    const lastAttempt = stored.lastAttemptAt ?? stored.updatedAt;
    if (Date.now() - lastAttempt < NETWORK_RETRY_MS) {
      return cacheFallback(stored);
    }
  }

  try {
    const [spot, monthly] = await Promise.all([fetchLatestCbuPoint(), fetchMonthlyPoints()]);
    let points = dedupePoints([...(monthly ?? []), ...(spot ? [spot] : [])]);
    points = trimToOneYear(points);

    if (spot) {
      await persistCbuSpot(spot);
    }

    if (points.length >= 2) {
      const saved = await writeStoredHistory(points);
      return {
        points: saved.points,
        updatedAt: saved.updatedAt,
        source: 'network',
        fromCache: false,
      };
    }

    if (stored && stored.points.length >= 2) {
      await writeStoredHistory(stored.points, stored.syncedOn, Date.now());
      return cacheFallback(stored);
    }

    const bundled = trimToOneYear(getBundledRatePoints());
    if (spot) {
      points = dedupePoints([...bundled, spot]);
      return {
        points: trimToOneYear(points),
        updatedAt: Date.now(),
        source: 'network',
        fromCache: false,
      };
    }

    return cacheFallback(stored);
  } catch {
    if (stored && stored.points.length >= 2) {
      await writeStoredHistory(stored.points, stored.syncedOn, Date.now());
    }
    return cacheFallback(stored);
  }
}

/** @deprecated use loadCurrencyData — kept for ListingsContext resume hook */
export async function syncCbuRateHistory(options?: { force?: boolean }) {
  const result = await loadCurrencyData(options?.force);
  return {
    points: result.points,
    fromCache: result.fromCache,
    updatedAt: result.updatedAt,
  };
}

export function getLastYearPoints(points: CbuRatePoint[]): CbuRatePoint[] {
  return trimToOneYear(points);
}

export type CurrencyHistoryMonths = 1 | 3 | 6 | 12;

export const CURRENCY_HISTORY_PERIODS: CurrencyHistoryMonths[] = [12, 6, 3, 1];

export function filterPointsByMonths(points: CbuRatePoint[], months: CurrencyHistoryMonths): CbuRatePoint[] {
  if (!points.length) return [];
  const cutoff = addDays(new Date(), -Math.round(months * 30.44));
  const cutoffIso = toLocalIsoDate(cutoff);
  const filtered = points.filter((point) => point.date >= cutoffIso);
  if (filtered.length >= 2) return filtered;

  const weeksNeeded = Math.max(2, Math.ceil((months * 30.44) / 7));
  return trimToOneYear(points).slice(-weeksNeeded);
}

export function computeRateStats(points: CbuRatePoint[]) {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const rates = points.map((point) => point.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);

  return {
    current: last.rate,
    currentDate: last.date,
    changePct: ((last.rate - first.rate) / first.rate) * 100,
    min,
    max,
    minDate: points.find((point) => point.rate === min)?.date ?? first.date,
    maxDate: points.find((point) => point.rate === max)?.date ?? last.date,
    startDate: first.date,
    endDate: last.date,
  };
}

export function formatRateDateLabel(isoDate: string, locale = 'en-GB'): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
}

export function formatRateDateFull(isoDate: string, locale = 'en-GB'): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export { resolveDateLocale };
