import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import {
  POI_CATEGORY_COLOR,
  POI_CATEGORY_ICON,
  POI_CONTEXT_MARKER_SIZE,
  POI_MARKER_SIZE,
} from '@/components/map/neighborhoodMarkerStyles';
import { fixedColors } from '@/lib/design/colors';
import type { NeighborhoodPoi, NearbyPoi } from '@/lib/neighborhood/amenities';

interface NeighborhoodMarkersLayerProps {
  pois: Array<NeighborhoodPoi | NearbyPoi>;
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
  /** Subtle dots under listing bubbles — no labels, smaller size. */
  variant?: 'context' | 'default';
}

export function NeighborhoodMarkersLayer({
  pois,
  getScreenPosition,
  variant = 'default',
}: NeighborhoodMarkersLayerProps) {
  if (pois.length === 0) return null;

  const isContext = variant === 'context';
  const size = isContext ? POI_CONTEXT_MARKER_SIZE : POI_MARKER_SIZE;
  const half = size / 2;

  return (
    <>
      {pois.map((poi, index) => {
        const screen = getScreenPosition(poi.lng, poi.lat);
        if (!screen) return null;
        const color = POI_CATEGORY_COLOR[poi.category];
        const icon = POI_CATEGORY_ICON[poi.category] as keyof typeof Ionicons.glyphMap;

        return (
          <View
            key={`${poi.id}-${index}`}
            style={[
              styles.anchor,
              isContext ? styles.anchorContext : styles.anchorDefault,
              { left: screen.x, top: screen.y },
            ]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.marker,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                  marginLeft: -half,
                  marginTop: -half,
                  opacity: isContext ? 0.82 : 1,
                  borderWidth: isContext ? 1.5 : 2,
                },
              ]}
            >
              <Ionicons name={icon} size={isContext ? 10 : 14} color={fixedColors.white} />
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    alignItems: 'center',
  },
  anchorContext: {
    zIndex: 1,
  },
  anchorDefault: {
    zIndex: 4,
  },
  marker: {
    borderColor: fixedColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: fixedColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
});
