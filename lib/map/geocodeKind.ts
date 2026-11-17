export type GeocodeSuggestionKind = 'address' | 'metro' | 'mall' | 'landmark';

const METRO_RE = /\bmetro\b|метро|stantsiya|station|bekati/i;
const METRO_FALSE_POSITIVE_RE = /metromed|metro\s*(market|shop|store|mall)/i;
const MALL_RE =
  /bozor|bazaar|mall|planet|mega|korzinka|makro|baraka|compass|samarqand|next|departament|supermarket|savdo\s*markazi|shopping/i;
const LANDMARK_RE =
  /maydon|square|monument|museum|muzey|tower|minora|masjid|mosque|park|bog['']|cathedral|memorial|haykal|statue|navoi|temur|independence|mustaqillik|teleminorasi|registan/i;

interface MaptilerFeatureMeta {
  placeType?: string[];
  category?: string;
  maki?: string;
  text?: string;
}

interface NominatimFeatureMeta {
  class?: string;
  type?: string;
  category?: string;
}

function labelMatchesMetro(label: string): boolean {
  if (METRO_FALSE_POSITIVE_RE.test(label)) return false;
  return METRO_RE.test(label);
}

/** Classify a geocoded place label + provider metadata into a suggestion kind. */
export function classifyGeocodeKind(
  label: string,
  meta?: MaptilerFeatureMeta | NominatimFeatureMeta,
): GeocodeSuggestionKind {
  const lower = label.toLowerCase();

  if (meta && 'placeType' in meta && meta.placeType) {
    const types = meta.placeType;
    if (types.includes('address') || types.includes('street') || types.includes('neighbourhood')) {
      return 'address';
    }
    if (types.includes('locality') || types.includes('district') || types.includes('region')) {
      return 'address';
    }
    if (types.includes('poi')) {
      if (labelMatchesMetro(label) || meta.category === 'railway' || meta.maki === 'rail') return 'metro';
      if (MALL_RE.test(lower) || meta.category === 'commercial' || meta.maki === 'shop') return 'mall';
      return 'landmark';
    }
  }

  if (meta && 'class' in meta && meta.class) {
    const cls = meta.class;
    const typ = meta.type ?? '';
    if (cls === 'railway' && (typ === 'station' || typ === 'stop' || typ === 'subway_entrance')) return 'metro';
    if (cls === 'shop' || typ === 'mall' || typ === 'supermarket' || typ === 'department_store') return 'mall';
    if (cls === 'tourism' || cls === 'historic' || typ === 'monument' || typ === 'museum' || typ === 'attraction') {
      return 'landmark';
    }
    if (cls === 'building' || cls === 'place' || cls === 'highway') return 'address';
  }

  if (labelMatchesMetro(label)) return 'metro';
  if (MALL_RE.test(lower)) return 'mall';
  if (LANDMARK_RE.test(lower)) return 'landmark';
  return 'address';
}
