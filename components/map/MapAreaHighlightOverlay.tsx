import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { MapAreaPolygon } from '@/types';

const FILL = 'rgba(220, 38, 38, 0.15)';
const STROKE = '#DC2626';
const STROKE_WIDTH = 2.5;

interface MapAreaHighlightOverlayProps {
  area: MapAreaPolygon;
  width: number;
  height: number;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
}

export function MapAreaHighlightOverlay({ area, width, height, project }: MapAreaHighlightOverlayProps) {
  const pointsAttr = useMemo(() => {
    if (width === 0 || height === 0 || area.points.length < 3) return '';
    const screen = area.points
      .map((point) => project(point.lng, point.lat))
      .filter((point): point is { x: number; y: number } => point != null);
    if (screen.length < 3) return '';
    return screen.map((point) => `${point.x},${point.y}`).join(' ');
  }, [area, project, width, height]);

  if (!pointsAttr) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={width} height={height}>
        <Polygon
          points={pointsAttr}
          fill={FILL}
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 3 },
});
