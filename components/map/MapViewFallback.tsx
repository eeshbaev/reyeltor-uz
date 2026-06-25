import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import Supercluster from 'supercluster';
import { ClusterBubble, getClusterSize } from './ClusterBubble';
import { ListingBubble } from './ListingBubble';
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS, TASHKENT_CENTER } from '@/lib/constants';
import { getMapBackgroundTileUrl } from '@/lib/mapTiles';
import type { MapListingPoint } from '@/types';

export interface MapViewProps {
  listings: MapListingPoint[];
  onListingPress: (id: string) => void;
  initialCenter?: { latitude: number; longitude: number; zoom: number };
}

export interface MapViewRef {
  flyToCoverage: (center: { latitude: number; longitude: number; zoom: number }) => void;
}

/** MapLibre-free map — works on web, Expo Go, and simulators without a dev build. */
export const MapView = forwardRef<MapViewRef, MapViewProps>(function MapViewFallback(
  { listings, onListingPress, initialCenter },
  ref,
) {
  const center = initialCenter ?? TASHKENT_CENTER;
  const [zoom, setZoom] = useState(center.zoom);
  const bounds: [number, number, number, number] = [69.0, 41.1, 69.5, 41.5];

  useImperativeHandle(ref, () => ({
    flyToCoverage: (c) => setZoom(c.zoom),
  }));

  const index = useMemo(() => {
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
  }, [listings]);

  const clusters = useMemo(() => index.getClusters(bounds, Math.floor(zoom)), [index, bounds, zoom]);

  const tileUrl = getMapBackgroundTileUrl(center.latitude, center.longitude, zoom);

  const markers = (
    <View style={styles.overlay} pointerEvents="box-none">
      {clusters.map((feature) => {
            const [lng, lat] = feature.geometry.coordinates;
            const leftPct = ((lng - 69.0) / 0.5) * 100;
            const topPct = ((41.5 - lat) / 0.4) * 100;
            const markerPos = { left: `${leftPct}%` as `${number}%`, top: `${topPct}%` as `${number}%` };
            const props = feature.properties as {
              cluster?: boolean;
              point_count?: number;
              listingId?: string;
              price?: number;
              featured?: boolean;
            };

            if (props.cluster) {
              const count = props.point_count ?? 0;
              return (
                <View key={`c-${feature.id}`} style={[styles.marker, markerPos]}>
                  <ClusterBubble
                    count={count}
                    size={getClusterSize(count)}
                    onPress={() => setZoom((z) => Math.min(z + 2, 16))}
                  />
                </View>
              );
            }

            if (zoom < CLUSTER_MAX_ZOOM) {
              return (
                <View key={props.listingId} style={[styles.marker, markerPos]}>
                  <ClusterBubble
                    count={1}
                    size={getClusterSize(1)}
                    onPress={() => onListingPress(props.listingId!)}
                  />
                </View>
              );
            }

            return (
              <View key={props.listingId} style={[styles.marker, markerPos]}>
                <ListingBubble
                  price={props.price ?? 0}
                  featured={props.featured}
                  onPress={() => onListingPress(props.listingId!)}
                />
              </View>
            );
          })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <ImageBackground source={{ uri: tileUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {markers}
      </View>
      <Pressable style={styles.zoomTap} onPress={() => setZoom((z) => z + 1)} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8eef5' },
  map: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  marker: { position: 'absolute', transform: [{ translateX: -20 }, { translateY: -20 }] },
  zoomTap: { ...StyleSheet.absoluteFillObject, opacity: 0 },
});
