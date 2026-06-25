import type { MapAreaCircle } from '@/types';

export interface CircleScreenMetrics {
  cx: number;
  cy: number;
  r: number;
  edgeX: number;
  edgeY: number;
}

export function getCircleScreenMetrics(
  circle: MapAreaCircle,
  project: (lng: number, lat: number) => { x: number; y: number } | null,
  pointer?: { x: number; y: number } | null,
): CircleScreenMetrics | null {
  const center = project(circle.lng, circle.lat);
  if (!center) return null;

  const edgeLng = circle.lng + circle.radiusM / (111_320 * Math.cos((circle.lat * Math.PI) / 180));
  const edge = project(edgeLng, circle.lat);
  if (!edge) return null;

  const r = Math.abs(edge.x - center.x);
  const edgeX = pointer?.x ?? edge.x;
  const edgeY = pointer?.y ?? edge.y;

  return { cx: center.x, cy: center.y, r, edgeX, edgeY };
}
