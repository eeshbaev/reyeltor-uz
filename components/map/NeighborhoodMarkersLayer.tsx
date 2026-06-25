import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { NearbyPoi } from '@/lib/neighborhood/amenities';
import {
  POI_CATEGORY_COLOR,
  POI_CATEGORY_ICON,
  POI_MARKER_SIZE,
} from '@/components/map/neighborhoodMarkerStyles';

interface NeighborhoodMarkersLayerProps {
  pois: NearbyPoi[];
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
}

export function NeighborhoodMarkersLayer({ pois, getScreenPosition }: NeighborhoodMarkersLayerProps) {
  if (pois.length === 0) return null;

  const half = POI_MARKER_SIZE / 2;

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
              styles.marker,
              {
                left: screen.x - half,
                top: screen.y - half,
                backgroundColor: color,
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name={icon} size={13} color="#ffffff" />
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    width: POI_MARKER_SIZE,
    height: POI_MARKER_SIZE,
    borderRadius: POI_MARKER_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
