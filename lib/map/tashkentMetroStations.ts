import {
  TASHKENT_METRO_LANDMARKS,
  landmarkDisplayName,
  type MapLandmark,
} from '@/lib/map/tashkentMapLandmarks';

/** @deprecated Prefer MapLandmark from tashkentMapLandmarks */
export interface MetroStation {
  id: string;
  name: string;
  nameUz: string;
  lat: number;
  lng: number;
}

export function metroDisplayName(station: Pick<MapLandmark, 'name' | 'nameUz'>, language: string): string {
  return landmarkDisplayName(station as MapLandmark, language);
}

export const TASHKENT_METRO_STATIONS: MetroStation[] = TASHKENT_METRO_LANDMARKS.map(
  ({ id, name, nameUz, lat, lng }) => ({ id, name, nameUz, lat, lng }),
);

export function filterMetroStations(query: string, language: string, limit = 3): MetroStation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return TASHKENT_METRO_STATIONS.filter((station) => {
    const label = language.startsWith('uz') ? station.nameUz : station.name;
    return (
      label.toLowerCase().includes(q) ||
      station.name.toLowerCase().includes(q) ||
      station.nameUz.toLowerCase().includes(q)
    );
  }).slice(0, limit);
}
