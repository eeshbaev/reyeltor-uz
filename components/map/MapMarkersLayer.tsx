import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Supercluster from 'supercluster';
import { ClusterBubble, getClusterSize } from './ClusterBubble';
import { ListingBubble } from './ListingBubble';
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS } from '@/lib/constants';
import type { CategoryColorSet } from '@/lib/design/categoryColors';
import type { MapListingPoint } from '@/types';

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

// Memoized cluster marker component
const MemoClusterMarker = memo(
  ({
    feature,
    index,
    markerStyle,
    count,
    categoryColors,
    onClusterPress,
  }: {
    feature: MapClusterFeature;
    index: number;
    markerStyle: { left: number; top: number };
    count: number;
    categoryColors: CategoryColorSet;
    onClusterPress: (lng: number, lat: number) => void;
  }) => {
    const [lng, lat] = feature.geometry.coordinates;
    return (
      <View key={`c-${feature.id ?? index}`} style={[styles.marker, markerStyle]} pointerEvents="auto">
        <ClusterBubble
          count={count}
          size={getClusterSize(count)}
          color={categoryColors.mapCluster}
          textColor={categoryColors.mapClusterText}
          onPress={() => onClusterPress(lng, lat)}
        />
      </View>
    );
  },
  // Position must be compared too: after a pan or zoom the same cluster sits at a new screen point.
  (prev, next) =>
    prev.feature.id === next.feature.id &&
    prev.count === next.count &&
    prev.markerStyle.left === next.markerStyle.left &&
    prev.markerStyle.top === next.markerStyle.top,
);

// Memoized listing bubble marker component
const MemoListingMarker = memo(
  ({
    feature,
    index,
    markerStyle,
    listingId,
    categoryColors,
    onListingPress,
  }: {
    feature: MapClusterFeature;
    index: number;
    markerStyle: { left: number; top: number };
    listingId: string;
    categoryColors: CategoryColorSet;
    onListingPress: (id: string) => void;
  }) => (
    <View key={`mk-${listingId}-${index}`} style={[styles.marker, markerStyle]} pointerEvents="auto">
      <ListingBubble
        price={(feature.properties as { price?: number }).price ?? 0}
        featured={(feature.properties as { featured?: boolean }).featured}
        accentColor={categoryColors.main}
        onPress={() => onListingPress(listingId)}
      />
    </View>
  ),
  (prev, next) =>
    prev.listingId === next.listingId &&
    prev.markerStyle.left === next.markerStyle.left &&
    prev.markerStyle.top === next.markerStyle.top &&
    prev.categoryColors === next.categoryColors,
);

export const MapMarkersLayer = memo(
  ({
    clusters,
    zoom,
    categoryColors,
    getScreenPosition,
    onListingPress,
    onClusterPress,
  }: MapMarkersLayerProps) => {
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

          const markerStyle = {
            left: screen.x,
            top: screen.y,
          };

          if (props.cluster) {
            const count = props.point_count ?? 0;
            if (count === 0) return null;
            return (
              <MemoClusterMarker
                key={`c-${feature.id ?? index}`}
                feature={feature}
                index={index}
                markerStyle={markerStyle}
                count={count}
                categoryColors={categoryColors}
                onClusterPress={onClusterPress}
              />
            );
          }

          // FIX #2: Add null check for listingId before rendering (it's optional)
          if (!props.listingId) return null;

          if (zoom < CLUSTER_MAX_ZOOM) {
            return (
              <View key={`pt-${props.listingId}-${index}`} style={[styles.marker, markerStyle]} pointerEvents="auto">
                <ClusterBubble
                  count={1}
                  size={getClusterSize(1)}
                  color={categoryColors.mapCluster}
                  textColor={categoryColors.mapClusterText}
                  onPress={() => onListingPress(props.listingId!)}
                />
              </View>
            );
          }

          return (
            <MemoListingMarker
              key={`mk-${props.listingId}-${index}`}
              feature={feature}
              index={index}
              markerStyle={markerStyle}
              listingId={props.listingId}
              categoryColors={categoryColors}
              onListingPress={onListingPress}
            />
          );
        })}
      </>
    );
  },
  // Re-render when the visible set or the projection changes (pan/zoom), not only when the count changes.
  (prev, next) =>
    prev.clusters === next.clusters &&
    prev.zoom === next.zoom &&
    prev.getScreenPosition === next.getScreenPosition &&
    prev.categoryColors === next.categoryColors &&
    prev.onListingPress === next.onListingPress &&
    prev.onClusterPress === next.onClusterPress,
);

export function buildClusterIndex(listings: MapListingPoint[]) {
  const cluster = new Supercluster<{ listingId: string; price: number; featured?: boolean }>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
  });

  // FIX #8: Filter out invalid listings before clustering to prevent crashes
  const validListings = listings.filter((l) => {
    return (
      l.id &&
      Number.isFinite(l.lat) &&
      Number.isFinite(l.lng) &&
      Number.isFinite(l.price)
    );
  });

  if (validListings.length === 0) {
    return cluster; // Return empty cluster if no valid data
  }

  cluster.load(
    validListings
      .filter((l) => l.id && Number.isFinite(l.price))
      .map((l) => ({
        type: 'Feature' as const,
        properties: {
          listingId: l.id,
          price: l.price,
          featured: l.is_featured ?? false,
          cluster: false,
        },
        geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
      })),
  );
  return cluster;
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 8,
  },
});
