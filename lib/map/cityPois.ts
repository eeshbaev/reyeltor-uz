import { lngLatToPixel } from '@/lib/mapProjection';
import type { NeighborhoodPoi } from '@/lib/neighborhood/amenities';
import { TASHKENT_POIS } from '@/lib/neighborhood/tashkentPois';

/** Street-level map context (schools, hospitals, parks, museums...) appears from this zoom. */
export const CITY_POI_MIN_ZOOM = 14;
/** Names are shown next to the icons from this zoom. */
export const CITY_POI_LABEL_ZOOM = 16;

const PHARMACY_RE = /apteka|pharmacy|dori|dorixona|аптека/i;
const MAJOR_HEALTH_RE = /hospital|shifoxona|больниц|клиник|clinic|medical|tibbiyot|markaz|center|центр/i;
const MAJOR_MARKET_RE = /bozor|bazaar|market|mall|korzinka|makro|baraka|havas|carrefour|supermarket|рынок|базар/i;

/**
 * How early a place appears (lower = earlier). Uses the OSM kind when the data has it,
 * otherwise falls back to the category and name.
 */
function minZoomFor(poi: NeighborhoodPoi): number | null {
  const label = `${poi.name} ${poi.nameUz}`;
  switch (poi.kind) {
    case 'metro':
      return null; // metro stations are drawn by the landmarks layer
    case 'hospital':
    case 'university':
    case 'museum':
    case 'mall':
    case 'stadium':
    case 'zoo':
    case 'theme_park':
    case 'water_park':
    case 'theatre':
      return 14;
    case 'park':
    case 'school':
    case 'college':
    case 'marketplace':
    case 'supermarket':
    case 'attraction':
      return 15;
    case 'kindergarten':
    case 'clinic':
    case 'garden':
    case 'library':
    case 'sports_centre':
    case 'place_of_worship':
      return 15.5;
    case 'doctors':
      return 16.5;
    case 'pharmacy':
      return 17;
    default:
      break;
  }
  // Older generated data without `kind`.
  switch (poi.category) {
    case 'transport':
      return null;
    case 'park':
    case 'culture':
      return 14.5;
    case 'school':
      return 15;
    case 'health':
      if (PHARMACY_RE.test(label)) return 17;
      return MAJOR_HEALTH_RE.test(label) ? 14.5 : 16;
    case 'market':
      return MAJOR_MARKET_RE.test(label) ? 15 : 17;
    default:
      return 16;
  }
}

const WITH_ZOOM = TASHKENT_POIS.map((poi) => ({ poi, minZoom: minZoomFor(poi) })).filter(
  (entry): entry is { poi: NeighborhoodPoi; minZoom: number } => entry.minZoom !== null,
);

/**
 * Places to draw in the current view. Important places win; then one icon per ~44 px cell,
 * so icons never pile up on each other.
 */
export function getVisibleCityPois(
  bounds: [number, number, number, number],
  zoom: number,
  max = 70,
): NeighborhoodPoi[] {
  if (zoom < CITY_POI_MIN_ZOOM) return [];
  const [west, south, east, north] = bounds;
  const padLng = (east - west) * 0.1;
  const padLat = (north - south) * 0.1;
  const candidates = WITH_ZOOM.filter(
    ({ poi, minZoom }) =>
      zoom >= minZoom &&
      poi.lng >= west - padLng &&
      poi.lng <= east + padLng &&
      poi.lat >= south - padLat &&
      poi.lat <= north + padLat,
  ).sort((a, b) => a.minZoom - b.minZoom);

  const cell = 44;
  const taken = new Set<string>();
  const picked: NeighborhoodPoi[] = [];
  for (const { poi } of candidates) {
    const px = lngLatToPixel(poi.lng, poi.lat, zoom);
    const key = `${Math.floor(px.x / cell)}:${Math.floor(px.y / cell)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    picked.push(poi);
    if (picked.length >= max) break;
  }
  return picked;
}
