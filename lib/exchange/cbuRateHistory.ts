import AsyncStorage from '@react-native-async-storage/async-storage';
import { CBU_RATE_HISTORY } from '@/lib/tools/currencyHistory';

const CBU_USD_HISTORY_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD';
const STORAGE_KEY = '@reyeltor/cbu-usd-history';
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const WEEKS_IN_YEAR = 52;
const FETCH_BATCH_SIZE = 8;

export interface CbuRatePoint {
  date: string;
  rate: number;
}

interface StoredHistory {
  updatedAt: number;
  points: CbuRatePoint[];
}

let memoryCache: StoredHistory | null = null;

function parseCbuResponseDate(value: string): string {
  const [day, month, year] = value.split('.');
  return `${year}-${month}-${day}`;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getSeedHistory(): CbuRatePoint[] {
  return CBU_RATE_HISTORY.map((entry) => ({
    date: `${entry.date}-15`,
    rate: entry.rate,
  }));
}

function dedupePoints(points: CbuRatePoint[]): CbuRatePoint[] {
  const byDate = new Map<string, CbuRatePoint>();
  for (const point of points) {
    byDate.set(point.date, point);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function getWeeklyDatesForYear(): string[] {
  const dates: string[] = [];
  const end = new Date();
  for (let week = WEEKS_IN_YEAR - 1; week >= 0; week -= 1) {
    dates.push(toIsoDate(addDays(end, -week * 7)));
  }
  return dates;
}

async function readStoredHistory(): Promise<StoredHistory | null> {
  if (memoryCache) return memoryCache;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHistory;
    if (!Array.isArray(parsed.points)) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function writeStoredHistory(points: CbuRatePoint[]): Promise<StoredHistory> {
  const payload: StoredHistory = {
    updatedAt: Date.now(),
    points: dedupePoints(points),
  };
  memoryCache = payload;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export async function fetchCbuUsdRateForDate(isoDate: string): Promise<CbuRatePoint | null> {
  try {
    const response = await fetch(`${CBU_USD_HISTORY_URL}/${isoDate}/`);
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ Rate?: string; Date?: string }>;
    const row = rows[0];
    if (!row?.Rate || !row.Date) return null;
    const rate = Number(row.Rate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return { date: parseCbuResponseDate(row.Date), rate };
  } catch {
    return null;
  }
}

async function fetchWeeklyHistory(): Promise<CbuRatePoint[]> {
  const dates = getWeeklyDatesForYear();
  const fetched: CbuRatePoint[] = [];

  for (let index = 0; index < dates.length; index += FETCH_BATCH_SIZE) {
    const batch = dates.slice(index, index + FETCH_BATCH_SIZE);
    const results = await Promise.all(batch.map((date) => fetchCbuUsdRateForDate(date)));
    for (const point of results) {
      if (point) fetched.push(point);
    }
  }

  return dedupePoints(fetched);
}

export async function loadCbuRateHistory(): Promise<CbuRatePoint[]> {
  const stored = await readStoredHistory();
  if (stored?.points.length) return stored.points;
  return getSeedHistory();
}

export async function syncCbuRateHistory(options?: { force?: boolean }): Promise<{
  points: CbuRatePoint[];
  fromCache: boolean;
  updatedAt: number | null;
}> {
  const stored = await readStoredHistory();
  const isFresh = stored && Date.now() - stored.updatedAt < HISTORY_TTL_MS;

  if (!options?.force && isFresh && stored.points.length >= 8) {
    return { points: stored.points, fromCache: true, updatedAt: stored.updatedAt };
  }

  const fetched = await fetchWeeklyHistory();
  if (fetched.length >= 8) {
    const saved = await writeStoredHistory(fetched);
    return { points: saved.points, fromCache: false, updatedAt: saved.updatedAt };
  }

  if (stored?.points.length) {
    return { points: stored.points, fromCache: true, updatedAt: stored.updatedAt };
  }

  const seed = getSeedHistory();
  return { points: seed, fromCache: true, updatedAt: null };
}

export function getLastYearPoints(points: CbuRatePoint[]): CbuRatePoint[] {
  return filterPointsByMonths(points, 12);
}

export type CurrencyHistoryMonths = 1 | 3 | 6 | 12;

export const CURRENCY_HISTORY_PERIODS: CurrencyHistoryMonths[] = [12, 6, 3, 1];

export function filterPointsByMonths(points: CbuRatePoint[], months: CurrencyHistoryMonths): CbuRatePoint[] {
  if (!points.length) return [];
  const cutoff = addDays(new Date(), -Math.round(months * 30.44));
  const cutoffIso = toIsoDate(cutoff);
  const filtered = points.filter((point) => point.date >= cutoffIso);
  if (filtered.length >= 2) return filtered;

  const weeksNeeded = Math.max(2, Math.ceil((months * 30.44) / 7));
  return points.slice(-weeksNeeded);
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

export function formatRateDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export function formatRateDateFull(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
