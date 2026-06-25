import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

/** Supabase Storage bucket for listing photos (must match dashboard bucket name). */
export const LISTINGS_STORAGE_BUCKET = 'reyeltor-listings';

const PLACEHOLDER_KEY_PATTERN = /placeholder|your_|example|test|dummy|invalid|changeme/i;

export function isMaptilerConfigured(): boolean {
  const key = maptilerKey.trim();
  return key.length >= 12 && !PLACEHOLDER_KEY_PATTERN.test(key);
}

export function getMapTileUrl(): string | null {
  if (!isMaptilerConfigured()) return null;
  return `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`;
}

export function getStaticMapUrl(
  lat: number,
  lng: number,
  width = 300,
  height = 200,
  marker = true,
): string | null {
  if (isMaptilerConfigured()) {
    const markerParam = marker ? `&markers=${lng},${lat},e74c3c` : '';
    return `https://api.maptiler.com/maps/streets-v2/static/${lng},${lat},15/${width}x${height}@2x.png?key=${maptilerKey}${markerParam}`;
  }
  const z = 14;
  const { x, y } = (() => {
    const scale = 2 ** z;
    const tx = Math.floor(((lng + 180) / 360) * scale);
    const latRad = (lat * Math.PI) / 180;
    const ty = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale);
    return { x: tx, y: ty };
  })();
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}@2x.png`;
}

export function isSupabaseConfigured(): boolean {
  const url = supabaseUrl.trim();
  const key = supabaseAnonKey.trim();
  return (
    url.length > 12 &&
    key.length > 20 &&
    !PLACEHOLDER_KEY_PATTERN.test(url) &&
    !PLACEHOLDER_KEY_PATTERN.test(key)
  );
}

export function shouldUseDemoData(): boolean {
  return !isSupabaseConfigured();
}

export function getPhotoUrl(storagePath: string): string {
  if (storagePath.startsWith('demo:')) return storagePath.slice(5);
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
  const { data } = supabase.storage.from(LISTINGS_STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
