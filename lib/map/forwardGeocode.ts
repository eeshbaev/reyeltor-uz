import { MAP_COVERAGE_BOUNDS } from '@/lib/constants';
import { classifyGeocodeKind, type GeocodeSuggestionKind } from '@/lib/map/geocodeKind';
import { isMaptilerConfigured, maptilerKey } from '@/lib/supabase';

export interface GeocodeSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  kind: GeocodeSuggestionKind;
}

const [WEST, SOUTH, EAST, NORTH] = MAP_COVERAGE_BOUNDS.city;

function pickLang(language: string): string {
  const base = language.split('-')[0]?.toLowerCase() ?? 'en';
  if (['uz', 'ru', 'en'].includes(base)) return base;
  return 'en';
}

function inTashkentCity(lat: number, lng: number): boolean {
  return lng >= WEST && lng <= EAST && lat >= SOUTH && lat <= NORTH;
}

async function forwardGeocodeMaptiler(query: string, language: string): Promise<GeocodeSuggestion[]> {
  const lang = pickLang(language);
  const encoded = encodeURIComponent(query.trim());
  const url = `https://api.maptiler.com/geocoding/${encoded}.json?key=${encodeURIComponent(maptilerKey)}&language=${lang}&limit=6&bbox=${WEST},${SOUTH},${EAST},${NORTH}&proximity=${(WEST + EAST) / 2},${(SOUTH + NORTH) / 2}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    features?: Array<{
      id?: string | number;
      place_name?: string;
      text?: string;
      center?: [number, number];
      place_type?: string[];
      properties?: { category?: string; maki?: string };
    }>;
  };

  return (data.features ?? [])
    .map((feature, index) => {
      const center = feature.center;
      if (!center) return null;
      const [lng, lat] = center;
      const label = feature.place_name?.trim();
      if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (!inTashkentCity(lat, lng)) return null;
      const kind = classifyGeocodeKind(label, {
        placeType: feature.place_type,
        category: feature.properties?.category,
        maki: feature.properties?.maki,
        text: feature.text,
      });
      return {
        id: String(feature.id ?? `${lat}-${lng}-${index}`),
        label,
        lat,
        lng,
        kind,
      };
    })
    .filter((item): item is GeocodeSuggestion => item !== null);
}

async function forwardGeocodeNominatim(query: string, language: string): Promise<GeocodeSuggestion[]> {
  const lang = pickLang(language);
  const params = new URLSearchParams({
    q: `${query.trim()}, Tashkent`,
    format: 'json',
    limit: '6',
    bounded: '1',
    viewbox: `${WEST},${NORTH},${EAST},${SOUTH}`,
    'accept-language': `${lang},ru,en`,
    addressdetails: '0',
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Reyeltor.uz/1.0 (listing address search)',
    },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    place_id?: number;
    display_name?: string;
    lat?: string;
    lon?: string;
    class?: string;
    type?: string;
    category?: string;
  }>;

  return data
    .map((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      const label = item.display_name?.split(',').slice(0, 3).join(', ').trim();
      if (!label || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (!inTashkentCity(lat, lng)) return null;
      const kind = classifyGeocodeKind(label, {
        class: item.class,
        type: item.type,
        category: item.category,
      });
      return {
        id: String(item.place_id ?? `${lat}-${lng}`),
        label,
        lat,
        lng,
        kind,
      };
    })
    .filter((item): item is GeocodeSuggestion => item !== null);
}

/** Turn a typed address into map coordinates within Tashkent city. */
export async function forwardGeocode(query: string, language = 'uz'): Promise<GeocodeSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  try {
    if (isMaptilerConfigured()) {
      const mapped = await forwardGeocodeMaptiler(trimmed, language);
      if (mapped.length > 0) return mapped;
    }
    return await forwardGeocodeNominatim(trimmed, language);
  } catch {
    return [];
  }
}
