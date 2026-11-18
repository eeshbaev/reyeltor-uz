import { Ionicons } from '@expo/vector-icons';
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
              left: screen.x,
              top: screen.y,
              transform: 'translate(-50%, -50%)',
              zIndex: isContext ? 1 : 3,
              pointerEvents: 'none',
              opacity: isContext ? 0.82 : 1,
            }}
            aria-hidden
          >
            <div
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                border: `${isContext ? 1.5 : 2}px solid #ffffff`,
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              }}
            >
              <Ionicons name={icon} size={isContext ? 10 : 14} color={fixedColors.white} />
            </div>
          </div>
        );
      })}
    </>
  );
}

export { POI_CATEGORY_COLOR, POI_CATEGORY_ICON };
