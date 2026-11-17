import * as FileSystem from 'expo-file-system';

const SPOT_TIMEOUT_MS = 8_000;
export const HISTORY_TIMEOUT_MS = 6_000;
const USER_AGENT = 'Reyeltor/1.2.2 (Mobile; +https://reyeltor.uz)';

export interface CbuRateRow {
  Rate?: string;
  Date?: string;
}

const PRIMARY_BASE = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD';

export function parseCbuResponseDate(value: string): string {
  const [day, month, year] = value.split('.');
  return `${year}-${month}-${day}`;
}

export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return toLocalIsoDate(new Date());
}

export function resolveDateLocale(language: string): string {
  switch (language.split('-')[0]) {
    case 'ru':
      return 'ru-RU';
    case 'uz':
      return 'uz-UZ';
    case 'zh':
      return 'zh-CN';
    case 'tr':
      return 'tr-TR';
    default:
      return 'en-GB';
  }
}

function parseRows(payload: unknown): CbuRateRow[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('Empty CBU payload');
  }
  return payload as CbuRateRow[];
}

function fetchViaXhr(url: string, timeoutMs: number): Promise<CbuRateRow[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error('CBU XHR timeout'));
    }, timeoutMs);

    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
    xhr.setRequestHeader('Accept-Language', 'ru-RU,ru;q=0.9,en;q=0.8');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.setRequestHeader('User-Agent', USER_AGENT);

    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`CBU XHR HTTP ${xhr.status}`));
        return;
      }
      try {
        resolve(parseRows(JSON.parse(xhr.responseText)));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('CBU parse error'));
      }
    };

    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error('CBU XHR network error'));
    };

    xhr.send();
  });
}

async function fetchViaFetch(url: string, timeoutMs: number): Promise<CbuRateRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`CBU HTTP ${response.status}`);
    return parseRows(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaFileSystem(url: string, timeoutMs: number): Promise<CbuRateRow[]> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error('No cache directory');

  const target = `${cacheDir}cbu-${Date.now()}.json`;

  const downloadTask = (async () => {
    const result = await FileSystem.downloadAsync(url, target, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });
    if (result.status !== 200) throw new Error(`CBU download HTTP ${result.status}`);
    return parseRows(JSON.parse(await FileSystem.readAsStringAsync(result.uri)));
  })();

  const timeoutTask = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('CBU download timeout')), timeoutMs);
  });

  return Promise.race([downloadTask, timeoutTask]);
}

async function fetchSingleUrl(url: string, timeoutMs: number): Promise<CbuRateRow[]> {
  const strategies = [
    () => fetchViaXhr(url, timeoutMs),
    () => fetchViaFetch(url, timeoutMs),
    () => fetchViaFileSystem(url, timeoutMs),
  ];

  let lastError: unknown;
  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('CBU fetch failed');
}

export async function fetchCbuJson(pathSuffix: string, timeoutMs = SPOT_TIMEOUT_MS): Promise<CbuRateRow[]> {
  return fetchSingleUrl(`${PRIMARY_BASE}${pathSuffix}`, timeoutMs);
}

export function rowToPoint(row: CbuRateRow | undefined): { date: string; rate: number } | null {
  if (!row?.Rate || !row.Date) return null;
  const rate = Number(String(row.Rate).replace(',', '.'));
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { date: parseCbuResponseDate(row.Date), rate };
}
