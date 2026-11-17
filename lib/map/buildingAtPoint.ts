import { isInsidePolygon, polygonCenter, type MapAreaPolygon } from '@/lib/map/polygon';

export interface BuildingAtPoint {
  id: string;
  outline: MapAreaPolygon;
  centroid: { lat: number; lng: number };
  label: string | null;
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SEARCH_RADIUS_M = 18;

function ringArea(points: Array<{ lat: number; lng: number }>): number {
  if (points.length < 3) return Infinity;
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j].lng + points[i].lng) * (points[j].lat - points[i].lat);
  }
  return Math.abs(area / 2);
}

function parseWayGeometry(
  element: {
    id?: number;
    tags?: { name?: string; 'addr:street'?: string; 'addr:housenumber'?: string };
    geometry?: Array<{ lat: number; lon: number }>;
  },
): BuildingAtPoint | null {
  const geometry = element.geometry;
  if (!geometry || geometry.length < 3) return null;

  const outline: MapAreaPolygon = {
    points: geometry.map((node) => ({ lat: node.lat, lng: node.lon })),
  };

  const name = element.tags?.name?.trim();
  const street = element.tags?.['addr:street']?.trim();
  const house = element.tags?.['addr:housenumber']?.trim();
  const label = name || [street, house].filter(Boolean).join(', ') || null;

  return {
    id: `building-${element.id ?? outline.points[0]?.lat}`,
    outline,
    centroid: polygonCenter(outline),
    label,
  };
}

/** Find the smallest OSM building footprint containing or nearest to a map tap. */
export async function fetchBuildingAtPoint(lat: number, lng: number): Promise<BuildingAtPoint | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const query = `
    [out:json][timeout:15];
    (
      way(around:${SEARCH_RADIUS_M},${lat},${lng})["building"];
    );
    out geom;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      elements?: Array<{
        id?: number;
        tags?: { name?: string; 'addr:street'?: string; 'addr:housenumber'?: string };
        geometry?: Array<{ lat: number; lon: number }>;
      }>;
    };

    const candidates = (data.elements ?? [])
      .map(parseWayGeometry)
      .filter((item): item is BuildingAtPoint => item !== null);

    if (candidates.length === 0) return null;

    const containing = candidates.filter((item) => isInsidePolygon(item.outline, lat, lng));
    const pool = containing.length > 0 ? containing : candidates;

    return pool.sort((a, b) => ringArea(a.outline.points) - ringArea(b.outline.points))[0] ?? null;
  } catch {
    return null;
  }
}
