import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCbuJson, rowToPoint } from '@/lib/exchange/cbuFetch';

const FALLBACK_USD_RATE = 12_017;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SPOT_STORAGE_KEY = '@reyeltor/cbu-spot-v1';

interface PersistedSpot {
  rate: number;
  date: string;
  fetchedAt: number;
}

let memorySpot: PersistedSpot | null = null;

async function readPersistedSpot(): Promise<PersistedSpot | null> {
  if (memorySpot) return memorySpot;
  try {
    const raw = await AsyncStorage.getItem(SPOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSpot;
    if (!Number.isFinite(parsed.rate) || parsed.rate <= 0) return null;
    memorySpot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function writePersistedSpot(rate: number, date: string): Promise<void> {
  memorySpot = { rate, date, fetchedAt: Date.now() };
  await AsyncStorage.setItem(SPOT_STORAGE_KEY, JSON.stringify(memorySpot));
}

export async function fetchCbuUsdRate(): Promise<number> {
  if (memorySpot && Date.now() - memorySpot.fetchedAt < CACHE_TTL_MS) {
    return memorySpot.rate;
  }

  const persisted = await readPersistedSpot();
  if (persisted && Date.now() - persisted.fetchedAt < CACHE_TTL_MS) {
    memorySpot = persisted;
    return persisted.rate;
  }

  try {
    const rows = await fetchCbuJson('/');
    const point = rowToPoint(rows[0]);
    if (!point) throw new Error('Invalid CBU rate');
    await writePersistedSpot(point.rate, point.date);
    return point.rate;
  } catch {
    if (persisted) return persisted.rate;
    return FALLBACK_USD_RATE;
  }
}

export async function persistCbuSpot(point: { rate: number; date: string }): Promise<void> {
  await writePersistedSpot(point.rate, point.date);
}

export async function loadPersistedSpotRate(): Promise<PersistedSpot | null> {
  return readPersistedSpot();
}

export function uzsToUsd(amountUzs: number, usdRate: number): number {
  return amountUzs / usdRate;
}

export function usdToUzs(amountUsd: number, usdRate: number): number {
  return Math.round(amountUsd * usdRate);
}

export function filterPriceToUzs(
  value: string,
  currency: 'UZS' | 'USD',
  usdRate: number,
): number | null {
  const num = Number(value.replace(/\s/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  return currency === 'USD' ? usdToUzs(num, usdRate) : num;
}

export { FALLBACK_USD_RATE };
