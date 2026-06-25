import { haversineMeters } from '@/lib/map/geo';

export type MapAreaPolygon = { points: Array<{ lat: number; lng: number }> };

type MapPoint = { lat: number; lng: number };

function segmentLength(a: MapPoint, b: MapPoint): number {
  return haversineMeters(a.lat, a.lng, b.lat, b.lng);
}

/** True when the path end is within 15% of total path length from the start. */
export function isClosedPath(points: MapPoint[]): boolean {
  if (points.length < 3) return false;

  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += segmentLength(points[i - 1], points[i]);
  }
  if (totalLength <= 0) return false;

  const closingDistance = segmentLength(points[points.length - 1], points[0]);
  return closingDistance / totalLength < 0.15;
}

function perpendicularDistanceDeg(point: MapPoint, start: MapPoint, end: MapPoint): number {
  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const px = point.lng - start.lng;
    const py = point.lat - start.lat;
    return Math.sqrt(px * px + py * py);
  }
  const t = ((point.lng - start.lng) * dx + (point.lat - start.lat) * dy) / lenSq;
  const projLng = start.lng + t * dx;
  const projLat = start.lat + t * dy;
  const ox = point.lng - projLng;
  const oy = point.lat - projLat;
  return Math.sqrt(ox * ox + oy * oy);
}

function douglasPeucker(points: MapPoint[], tolerance: number): MapPoint[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistanceDeg(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = douglasPeucker(points.slice(0, index + 1), tolerance);
    const right = douglasPeucker(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

export function simplifyPath(points: MapPoint[], tolerance: number): MapPoint[] {
  if (points.length <= 2) return points;
  return douglasPeucker(points, tolerance);
}

export function isInsidePolygon(polygon: MapAreaPolygon, lat: number, lng: number): boolean {
  const { points } = polygon;
  if (points.length < 3) return false;

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const yi = points[i].lat;
    const xi = points[i].lng;
    const yj = points[j].lat;
    const xj = points[j].lng;
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonBounds(polygon: MapAreaPolygon): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const point of polygon.points) {
    minLng = Math.min(minLng, point.lng);
    minLat = Math.min(minLat, point.lat);
    maxLng = Math.max(maxLng, point.lng);
    maxLat = Math.max(maxLat, point.lat);
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function polygonCenter(polygon: MapAreaPolygon): { lat: number; lng: number } {
  const { points } = polygon;
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}
