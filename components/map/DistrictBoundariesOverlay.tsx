import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { CITY_BOUNDARY_STYLE, REGION_BOUNDARY_STYLE } from '@/lib/map/boundaryConstants';
import { getDistrictCollection } from '@/lib/map/districtBoundaries';
import type { BoundaryTier } from '@/lib/map/districtBoundaries';
import type { MapCoverage } from '@/lib/constants';

function tierStyle(tier: BoundaryTier) {
  return tier === 'region' ? REGION_BOUNDARY_STYLE : CITY_BOUNDARY_STYLE;
}

interface DistrictBoundariesOverlayProps {
  coverage: MapCoverage;
  width: number;
  height: number;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
}

export function DistrictBoundariesOverlay({
  coverage,
  width,
  height,
  project,
}: DistrictBoundariesOverlayProps) {
  const districts = useMemo(() => getDistrictCollection(coverage).features, [coverage]);

  const shapes = useMemo(() => {
    if (width === 0 || height === 0) return [];
    return districts
      .map((feature) => {
        const ring = feature.geometry.coordinates[0];
        const points = ring
          .map(([lng, lat]) => project(lng, lat))
          .filter((p): p is { x: number; y: number } => p != null);
        if (points.length < 3) return null;
        const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
        const { name, tier } = feature.properties;
        return { name, tier, pointsAttr };
      })
      .filter(Boolean) as {
      name: string;
      tier: BoundaryTier;
      pointsAttr: string;
    }[];
  }, [districts, project, width, height]);

  if (shapes.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={width} height={height}>
        {shapes.map((shape) => {
          const style = tierStyle(shape.tier);
          return (
            <Polygon
              key={`${shape.tier}-${shape.name}`}
              points={shape.pointsAttr}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={shape.tier === 'region' ? '4,3' : undefined}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
});
