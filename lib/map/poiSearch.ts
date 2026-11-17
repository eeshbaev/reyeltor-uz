import type { LocationSuggestionKind } from '@/lib/map/locationSuggestions';
import { TASHKENT_POIS, type NeighborhoodPoi } from '@/lib/neighborhood/amenities';

const MAJOR_MARKET_RE =
  /bozor|bazaar|market|mall|planet|city|korzinka|makro|baraka|compass|samarqand|next|mega|departament|supermarket/i;
const LANDMARK_RE =
  /tower|minora|museum|muzey|maydon|monument|masjid|mosque|cathedral|haykal|navoi|temur|independence|mustaqillik|registan|pushkin|amir/i;

function poiKind(poi: NeighborhoodPoi): LocationSuggestionKind {
  const label = `${poi.name} ${poi.nameUz}`;
  if (poi.category === 'market' && MAJOR_MARKET_RE.test(label)) return 'mall';
  if (poi.category === 'culture' && LANDMARK_RE.test(label)) return 'landmark';
  if (poi.category === 'culture') return 'landmark';
  return 'landmark';
}

function poiLabel(poi: NeighborhoodPoi, language: string): string {
  return language.startsWith('uz') ? poi.nameUz : poi.name;
}

export interface PoiSearchMatch {
  id: string;
  kind: LocationSuggestionKind;
  label: string;
  lat: number;
  lng: number;
}

/** Search curated POIs for malls and landmarks matching the query. */
export function searchPoiSuggestions(query: string, language: string, limit = 3): PoiSearchMatch[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];

  const matches: PoiSearchMatch[] = [];

  for (const poi of TASHKENT_POIS) {
    if (poi.category !== 'market' && poi.category !== 'culture') continue;

    const label = poiLabel(poi, language);
    const haystack = `${poi.name} ${poi.nameUz}`.toLowerCase();
    if (!haystack.includes(q) && !label.toLowerCase().includes(q)) continue;

    const kind = poiKind(poi);
    if (kind === 'mall' && !MAJOR_MARKET_RE.test(haystack)) continue;
    if (kind === 'landmark' && poi.category === 'culture' && !LANDMARK_RE.test(haystack) && q.length < 4) continue;

    matches.push({
      id: poi.id,
      kind,
      label,
      lat: poi.lat,
      lng: poi.lng,
    });
    if (matches.length >= limit) break;
  }

  return matches.sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
}
