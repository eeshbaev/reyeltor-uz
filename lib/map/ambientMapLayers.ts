import type { MapLandmark, MapLandmarkKind } from '@/lib/map/tashkentMapLandmarks';
import { TASHKENT_MAP_LANDMARKS } from '@/lib/map/tashkentMapLandmarks';

const ALWAYS_VISIBLE_KINDS = new Set<MapLandmarkKind>(['metro', 'railway', 'airport']);

function inBounds(
  lat: number,
  lng: number,
  bounds: [number, number, number, number],
): boolean {
  const [west, south, east, north] = bounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

function thinByGrid(landmarks: MapLandmark[], cellDeg: number, maxTotal: number): MapLandmark[] {
  const grid = new Map<string, MapLandmark>();
  for (const landmark of landmarks) {
    const key = `${Math.floor(landmark.lat / cellDeg)}:${Math.floor(landmark.lng / cellDeg)}:${landmark.kind}`;
    if (!grid.has(key)) grid.set(key, landmark);
  }
  return Array.from(grid.values()).slice(0, maxTotal);
}

function maxLandmarksForZoom(zoom: number): number {
  if (zoom < 11) return 24;
  if (zoom < 12) return 36;
  if (zoom < 13) return 48;
  if (zoom < 14) return 64;
  if (zoom < 15) return 80;
  return 120;
}

function gridCellForZoom(zoom: number): number {
  if (zoom < 11) return 0.028;
  if (zoom < 12) return 0.018;
  if (zoom < 13) return 0.014;
  if (zoom < 14) return 0.01;
  if (zoom < 15) return 0.007;
  return 0.004;
}

function minZoomForKind(kind: MapLandmarkKind): number {
  if (kind === 'metro') return 10;
  if (kind === 'railway' || kind === 'airport') return 10;
  if (kind === 'park') return 11;
  return 12;
}

export function getVisibleMapLandmarks(
  bounds: [number, number, number, number],
  zoom: number,
): MapLandmark[] {
  const inView = TASHKENT_MAP_LANDMARKS.filter(
    (landmark) =>
      inBounds(landmark.lat, landmark.lng, bounds) && zoom >= minZoomForKind(landmark.kind),
  );

  const priority = inView.filter((landmark) => ALWAYS_VISIBLE_KINDS.has(landmark.kind));
  const scenic = inView.filter((landmark) => !ALWAYS_VISIBLE_KINDS.has(landmark.kind));
  const thinnedScenic = thinByGrid(scenic, gridCellForZoom(zoom), maxLandmarksForZoom(zoom));

  const metro = priority.filter((landmark) => landmark.kind === 'metro');
  const hubs = priority.filter((landmark) => landmark.kind === 'railway' || landmark.kind === 'airport');

  return [...thinnedScenic, ...hubs, ...metro];
}

/** @deprecated Use getVisibleMapLandmarks */
export function getVisibleMetroStations(bounds: [number, number, number, number]) {
  return TASHKENT_MAP_LANDMARKS.filter(
    (landmark) => landmark.kind === 'metro' && inBounds(landmark.lat, landmark.lng, bounds),
  ).map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    nameUz: landmark.nameUz,
    lat: landmark.lat,
    lng: landmark.lng,
  }));
}

/** @deprecated Ambient POIs replaced by curated landmarks */
export function getAmbientMapPois(
  bounds: [number, number, number, number],
  zoom: number,
  _excludeIds?: Set<string>,
) {
  return getVisibleMapLandmarks(bounds, zoom).filter((landmark) => landmark.kind !== 'metro');
}
