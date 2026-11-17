import { isMaptilerConfigured, maptilerKey } from '@/lib/supabase';

export interface ReverseGeocodeResult {
  /** Human-readable single-line address for display. */
  label: string;
  street: string | null;
  houseNumber: string | null;
  neighbourhood: string | null;
}

function pickLang(language: string): string {
  const base = language.split('-')[0]?.toLowerCase() ?? 'en';
  if (['uz', 'ru', 'en'].includes(base)) return base;
  return 'en';
}

function buildStreetLabel(street: string | null, houseNumber: string | null, fallback: string): string {
  const parts = [street, houseNumber].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return fallback;
}

async function reverseGeocodeMaptiler(
  lat: number,
  lng: number,
  language: string,
): Promise<ReverseGeocodeResult | null> {
  const lang = pickLang(language);
  const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(maptilerKey)}&language=${lang}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      place_name?: string;
      text?: string;
      address?: string;
      context?: Array<{ id?: string; text?: string }>;
    }>;
  };

  const feature = data.features?.[0];
  if (!feature) return null;

  const street = feature.text?.trim() || null;
  const houseNumber = feature.address?.trim() || null;
  const neighbourhood =
    feature.context?.find((item) => item.id?.startsWith('neighbourhood'))?.text?.trim() ||
    feature.context?.find((item) => item.id?.startsWith('suburb'))?.text?.trim() ||
    null;
  const label = feature.place_name?.trim() || buildStreetLabel(street, houseNumber, neighbourhood ?? '');

  if (!label) return null;
  return { label, street, houseNumber, neighbourhood };
}

async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
  language: string,
): Promise<ReverseGeocodeResult | null> {
  const lang = pickLang(language);
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    'accept-language': `${lang},ru,en`,
    addressdetails: '1',
    zoom: '18',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Reyeltor.uz/1.0 (listing pin picker)',
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    address?: {
      road?: string;
      house_number?: string;
      neighbourhood?: string;
      suburb?: string;
      quarter?: string;
    };
  };

  const addr = data.address;
  const street = addr?.road?.trim() || null;
  const houseNumber = addr?.house_number?.trim() || null;
  const neighbourhood = addr?.neighbourhood?.trim() || addr?.suburb?.trim() || addr?.quarter?.trim() || null;
  const label =
    buildStreetLabel(street, houseNumber, '') ||
    data.display_name?.split(',').slice(0, 2).join(', ').trim() ||
    neighbourhood;

  if (!label) return null;
  return { label, street, houseNumber, neighbourhood };
}

/** Resolve coordinates to a nearby street/building label (Tashkent area). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  language = 'uz',
): Promise<ReverseGeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  try {
    if (isMaptilerConfigured()) {
      const mapped = await reverseGeocodeMaptiler(lat, lng, language);
      if (mapped) return mapped;
    }
    return await reverseGeocodeNominatim(lat, lng, language);
  } catch {
    return null;
  }
}
