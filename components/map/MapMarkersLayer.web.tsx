import Supercluster from 'supercluster';
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS } from '@/lib/constants';
import type { CategoryColorSet } from '@/lib/design/categoryColors';
import type { MapListingPoint } from '@/types';
import { ClusterBubble, getClusterSize } from './ClusterBubble';
import { ListingBubble } from './ListingBubble';

type MapClusterFeature = Supercluster.ClusterFeature<{
  cluster?: boolean;
  listingId?: string;
  price?: number;
  featured?: boolean;
}> | Supercluster.PointFeature<{
  listingId: string;
  price: number;
  featured?: boolean;
}>;

interface MapMarkersLayerProps {
  clusters: MapClusterFeature[];
  zoom: number;
  categoryColors: CategoryColorSet;
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
  onListingPress: (id: string) => void;
  onClusterPress: (lng: number, lat: number) => void;
}

export function MapMarkersLayer({
  clusters,
  zoom,
  categoryColors,
  getScreenPosition,
  onListingPress,
  onClusterPress,
}: MapMarkersLayerProps) {
  if (clusters.length === 0) return null;

  return (
    <>
      {clusters.map((feature, index) => {
        const [lng, lat] = feature.geometry.coordinates;
        const screen = getScreenPosition(lng, lat);
        if (!screen) return null;

        const props = feature.properties as {
          cluster?: boolean;
          point_count?: number;
          listingId?: string;
          price?: number;
          featured?: boolean;
        };

        if (props.cluster) {
          const count = props.point_count ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={`c-${feature.id ?? index}`}
              style={{
                position: 'absolute',
                left: screen.x,
                top: screen.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'auto',
              }}
            >
              <ClusterBubble
                count={count}
                size={getClusterSize(count)}
                color={categoryColors.mapCluster}
                textColor={categoryColors.mapClusterText}
                onPress={() => onClusterPress(lng, lat)}
              />
            </div>
          );
        }

        if (zoom < CLUSTER_MAX_ZOOM) {
          return (
            <div
              key={`pt-${props.listingId}-${index}`}
              style={{
                position: 'absolute',
                left: screen.x,
                top: screen.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
                pointerEvents: 'auto',
              }}
            >
              <ClusterBubble
                count={1}
                size={getClusterSize(1)}
                color={categoryColors.mapCluster}
                textColor={categoryColors.mapClusterText}
                onPress={() => onListingPress(props.listingId!)}
              />
            </div>
          );
        }

        return (
          <div
            key={`mk-${props.listingId}-${index}`}
            style={{
              position: 'absolute',
              left: screen.x,
              top: screen.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              pointerEvents: 'auto',
            }}
          >
            <ListingBubble
              price={props.price ?? 0}
              featured={props.featured}
              accentColor={categoryColors.main}
              onPress={() => onListingPress(props.listingId!)}
            />
          </div>
        );
      })}
    </>
  );
}

export function buildClusterIndex(listings: MapListingPoint[]) {
  const cluster = new Supercluster<{ listingId: string; price: number; featured?: boolean }>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
  });
  cluster.load(
    listings.map((l) => ({
      type: 'Feature' as const,
      properties: { listingId: l.id, price: l.price, featured: l.is_featured, cluster: false },
      geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
    })),
  );
  return cluster;
}
