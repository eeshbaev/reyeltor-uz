import { Ionicons } from '@expo/vector-icons';
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
          <div
            key={`${poi.id}-${index}`}
            style={{
              position: 'absolute',
              left: screen.x - half,
              top: screen.y - half,
              width: POI_MARKER_SIZE,
              height: POI_MARKER_SIZE,
              borderRadius: POI_MARKER_SIZE / 2,
              border: '2px solid #ffffff',
              backgroundColor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
              zIndex: 3,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <Ionicons name={icon} size={13} color="#ffffff" />
          </div>
        );
      })}
    </>
  );
}

export { POI_CATEGORY_COLOR, POI_CATEGORY_ICON };
