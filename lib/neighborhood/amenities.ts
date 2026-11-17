import {
  POI_FOCUS_RADIUS_M,
  POI_MAP_OVERLAY_MAX,
  POI_MAP_OVERLAY_RADIUS_M,
} from '@/lib/neighborhood/poiMapConstants';
import { TASHKENT_POIS } from '@/lib/neighborhood/tashkentPois';

export type AmenityCategory = 'park' | 'market' | 'school' | 'health' | 'transport' | 'culture';

export interface NeighborhoodPoi {
  id: string;
  name: string;
  nameUz: string;
  category: AmenityCategory;
  /** OSM kind, e.g. hospital, kindergarten, university, metro, museum (empty in older data). */
  kind?: string;
  lat: number;
  lng: number;
}

export { TASHKENT_POIS };

/** OSM POIs excluding mislabeled bus stops (transport category). */
export const TASHKENT_POIS_MAP = TASHKENT_POIS.filter((poi) => poi.category !== 'transport');

const EARTH_RADIUS_M = 6_371_000;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export interface NearbyPoi extends NeighborhoodPoi {
  distanceM: number;
}

export function getNearbyAmenities(lat: number, lng: number, radiusM = POI_FOCUS_RADIUS_M): NearbyPoi[] {
  return getNearbyAmenitiesForSheet(lat, lng).filter((poi) => poi.distanceM <= radiusM);
}

const MAJOR_MARKET_RE =
  /bozor|bazaar|market|mall|planet|city|korzinka|makro|baraka|compass|samarqand|next|mega|departament|supermarket/i;
const MAJOR_HEALTH_RE = /hospital|shifoxona|клиник|clinic|medical|poliklinika|tibbiyot|emergency|respublika/i;
const PHARMACY_RE = /apteka|pharmacy|dori|dorixona|drugstore/i;

function isMajorMapPoi(poi: NeighborhoodPoi): boolean {
  const label = `${poi.name} ${poi.nameUz}`;
  if (PHARMACY_RE.test(label)) return false;
  if (poi.category === 'transport') return false;
  if (poi.category === 'health') return MAJOR_HEALTH_RE.test(label);
  if (poi.category === 'market') return MAJOR_MARKET_RE.test(label);
  return true;
}

/** Full nearby list for the neighborhood sheet (includes pharmacies and smaller shops). */
export function getNearbyAmenitiesForSheet(lat: number, lng: number): NearbyPoi[] {
  return TASHKENT_POIS_MAP.map((poi) => ({
    ...poi,
    distanceM: Math.round(haversineMeters(lat, lng, poi.lat, poi.lng)),
  }))
    .filter((poi) => poi.distanceM <= POI_FOCUS_RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 40);
}

/** A small, curated set of nearby places when one listing is focused on the map. */
export function getMapContextPois(lat: number, lng: number): NearbyPoi[] {
  const nearby = TASHKENT_POIS_MAP.map((poi) => ({
    ...poi,
    distanceM: Math.round(haversineMeters(lat, lng, poi.lat, poi.lng)),
  }))
    .filter((poi) => poi.distanceM <= POI_MAP_OVERLAY_RADIUS_M && isMajorMapPoi(poi))
    .sort((a, b) => a.distanceM - b.distanceM);

  const picked: NearbyPoi[] = [];
  const seenCategories = new Set<AmenityCategory>();

  for (const poi of nearby) {
    if (seenCategories.has(poi.category)) continue;
    picked.push(poi);
    seenCategories.add(poi.category);
    if (picked.length >= POI_MAP_OVERLAY_MAX) break;
  }

  for (const poi of nearby) {
    if (picked.length >= POI_MAP_OVERLAY_MAX) break;
    if (picked.some((item) => item.id === poi.id)) continue;
    picked.push(poi);
  }

  return picked.slice(0, POI_MAP_OVERLAY_MAX);
}

export function groupAmenitiesByCategory(pois: NearbyPoi[]): Record<AmenityCategory, NearbyPoi[]> {
  const groups: Record<AmenityCategory, NearbyPoi[]> = {
    park: [],
    market: [],
    school: [],
    health: [],
    transport: [],
    culture: [],
  };
  for (const poi of pois) groups[poi.category].push(poi);
  return groups;
}

export function poiDisplayName(poi: NeighborhoodPoi, language: string): string {
  return language.startsWith('uz') ? poi.nameUz : poi.name;
}
