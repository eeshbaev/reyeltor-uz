import { filterDistricts } from '@/lib/map/districtBoundaries';
import { forwardGeocode } from '@/lib/map/forwardGeocode';
import type { GeocodeSuggestionKind } from '@/lib/map/geocodeKind';
import { searchPoiSuggestions } from '@/lib/map/poiSearch';
import { filterMetroStations } from '@/lib/map/tashkentMetroStations';

export type LocationSuggestionKind = 'district' | GeocodeSuggestionKind;

export interface LocationSuggestion {
  id: string;
  kind: LocationSuggestionKind;
  label: string;
  subtitle?: string;
  lat: number;
  lng: number;
  district?: string;
}

const MAX_SUGGESTIONS = 10;
const EXACT_KINDS: LocationSuggestionKind[] = ['address', 'metro', 'mall', 'landmark'];

/** District, metro, mall, landmark, and street address suggestions for listing location. */
export async function searchLocationSuggestions(
  query: string,
  language: string,
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const districtMatches = filterDistricts(trimmed).slice(0, 2).map((name) => ({
    id: `district-${name}`,
    kind: 'district' as const,
    label: name,
    subtitle: 'district',
    lat: 0,
    lng: 0,
    district: name,
  }));

  if (trimmed.length < 3) {
    return districtMatches;
  }

  const metroMatches = filterMetroStations(trimmed, language, 2).map((station) => ({
    id: station.id,
    kind: 'metro' as const,
    label: language.startsWith('uz') ? station.nameUz : station.name,
    subtitle: 'metro',
    lat: station.lat,
    lng: station.lng,
  }));

  const poiMatches = searchPoiSuggestions(trimmed, language, 2).map((poi) => ({
    id: poi.id,
    kind: poi.kind,
    label: poi.label,
    subtitle: poi.kind,
    lat: poi.lat,
    lng: poi.lng,
  }));

  const addresses = await forwardGeocode(trimmed, language);
  const addressMatches: LocationSuggestion[] = addresses.map((item) => ({
    id: item.id,
    kind: item.kind,
    label: item.label,
    subtitle: item.kind,
    lat: item.lat,
    lng: item.lng,
  }));

  const seen = new Set<string>();
  const merged: LocationSuggestion[] = [];

  for (const item of [...districtMatches, ...metroMatches, ...poiMatches, ...addressMatches]) {
    const key = `${item.kind}:${item.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= MAX_SUGGESTIONS) break;
  }

  return merged;
}

export function isExactLocationSuggestion(suggestion: LocationSuggestion): suggestion is LocationSuggestion & {
  kind: 'address' | 'metro' | 'mall' | 'landmark';
  lat: number;
  lng: number;
} {
  return (
    EXACT_KINDS.includes(suggestion.kind) &&
    Number.isFinite(suggestion.lat) &&
    Number.isFinite(suggestion.lng)
  );
}
