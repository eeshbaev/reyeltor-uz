import type { MapAreaCircle } from '@/types';

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function circleBounds(circle: MapAreaCircle): [[number, number], [number, number]] {
  const latDelta = circle.radiusM / 111_320;
  const lngDelta = circle.radiusM / (111_320 * Math.cos((circle.lat * Math.PI) / 180));
  return [
    [circle.lng - lngDelta, circle.lat - latDelta],
    [circle.lng + lngDelta, circle.lat + latDelta],
  ];
}

export function zoomForCircleRadius(lat: number, radiusM: number, viewportWidth = 360): number {
  const padded = radiusM * 2.4;
  const metersPerPixel = padded / viewportWidth;
  const zoom = Math.log2((156_543.03 * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
  return Math.min(18, Math.max(7, zoom));
}

export function isInsideCircle(circle: MapAreaCircle, lat: number, lng: number): boolean {
  return haversineMeters(circle.lat, circle.lng, lat, lng) <= circle.radiusM;
}

export { polygonBounds, polygonCenter } from '@/lib/map/polygon';
