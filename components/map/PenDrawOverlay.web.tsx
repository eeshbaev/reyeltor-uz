import { useEffect, useRef } from 'react';
import {
  isClosedPath,
  simplifyPath,
  type MapAreaPolygon,
} from '@/lib/map/polygon';
import type { MapViewRef } from './types';

interface PenDrawOverlayProps {
  mapRef: React.RefObject<MapViewRef | null>;
  onComplete: (polygon: MapAreaPolygon) => void;
  onCancel: () => void;
}

export function PenDrawOverlay({ mapRef, onComplete, onCancel }: PenDrawOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const screenPoints = useRef<{ x: number; y: number }[]>([]);
  const latlngPoints = useRef<{ lat: number; lng: number }[]>([]);
  const svgPathRef = useRef<SVGPolylineElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getPoint = (e: MouseEvent | TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing.current = true;
      screenPoints.current = [];
      latlngPoints.current = [];
      const p = getPoint(e);
      screenPoints.current.push(p);
      const ll = mapRef.current?.unproject(p.x, p.y);
      if (ll) latlngPoints.current.push(ll);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const p = getPoint(e);
      const last = screenPoints.current[screenPoints.current.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3) return;
      screenPoints.current.push(p);
      const ll = mapRef.current?.unproject(p.x, p.y);
      if (ll) latlngPoints.current.push(ll);
      if (svgPathRef.current) {
        svgPathRef.current.setAttribute(
          'points',
          screenPoints.current.map((pt) => `${pt.x},${pt.y}`).join(' '),
        );
      }
    };

    const onEnd = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (latlngPoints.current.length < 10) {
        onCancel();
        return;
      }
      if (isClosedPath(latlngPoints.current)) {
        const simplified = simplifyPath(latlngPoints.current, 0.0001);
        onComplete({ points: simplified });
      } else {
        onCancel();
      }
    };

    el.addEventListener('mousedown', onStart);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onEnd);
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);

    return () => {
      el.removeEventListener('mousedown', onStart);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseup', onEnd);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [mapRef, onComplete, onCancel]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 999, touchAction: 'none' }}
    >
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <polyline ref={svgPathRef} stroke="#DC2626" strokeWidth="2.5" fill="none" points="" />
      </svg>
    </div>
  );
}
