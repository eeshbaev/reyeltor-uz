import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, PixelRatio, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { DistrictBoundariesOverlay } from './DistrictBoundariesOverlay';
import { DistrictLabelsOverlay } from './DistrictLabelsOverlay';
import { MapAreaHighlightOverlay } from './MapAreaHighlightOverlay';
import { buildClusterIndex, MapMarkersLayer } from './MapMarkersLayer';
import { ListingBubble } from './ListingBubble';
import { NeighborhoodMarkersLayer } from './NeighborhoodMarkersLayer';
import type { MapViewProps, MapViewRef } from './types';
import { TASHKENT_CENTER } from '@/lib/constants';
import { MAP_PAN_GESTURE } from '@/lib/gestures';
import { haversineMeters } from '@/lib/map/geo';
import { getNearbyAmenities } from '@/lib/neighborhood/amenities';
import { polygonBounds, polygonCenter } from '@/lib/map/polygon';
import {
  clampZoom,
  getBoundsFromViewport,
  getVisibleTiles,
  lngLatToPixel,
  lngLatToScreen,
  pixelToLngLat,
  tileToScreen,
} from '@/lib/mapProjection';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { useTheme } from '@/lib/theme';

function zoomForPolygonBounds(
  polygon: MapAreaPolygon,
  viewportWidth: number,
  viewportHeight: number,
): number {
  const bounds = polygonBounds(polygon);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latSpanM = haversineMeters(bounds.minLat, bounds.minLng, bounds.maxLat, bounds.minLng);
  const lngSpanM = haversineMeters(bounds.minLat, bounds.minLng, bounds.minLat, bounds.maxLng);
  const paddedLat = latSpanM * 1.35;
  const paddedLng = lngSpanM * 1.35;
  const metersPerPixelX = paddedLng / viewportWidth;
  const metersPerPixelY = paddedLat / viewportHeight;
  const metersPerPixel = Math.max(metersPerPixelX, metersPerPixelY, 40);
  const zoom = Math.log2((156_543.03 * Math.cos((centerLat * Math.PI) / 180)) / metersPerPixel);
  return Math.min(18, Math.max(7, zoom));
}

export const InteractiveTileMap = forwardRef<MapViewRef, MapViewProps>(function InteractiveTileMap(
  {
    listings,
    listingCategory,
    onListingPress,
    initialCenter,
    coverage = 'city',
    drawMode = false,
    searchArea = null,
    showMarkers = true,
    focusedListing = null,
    districtDetail,
  },
  ref,
) {
  const theme = useTheme();
  const categoryColors = getCategoryColors(theme.scheme, listingCategory);
  const start = initialCenter ?? TASHKENT_CENTER;
  const [centerLng, setCenterLng] = useState(start.longitude);
  const [centerLat, setCenterLat] = useState(start.latitude);
  const [zoom, setZoom] = useState(clampZoom(start.zoom));
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const retina = PixelRatio.get() >= 1.5;

  const panOrigin = useRef({ lng: start.longitude, lat: start.latitude });
  const pinchBaseZoom = useRef(zoom);
  const viewportRef = useRef({ lng: centerLng, lat: centerLat, zoom });
  const panOffsetX = useSharedValue(0);
  const panOffsetY = useSharedValue(0);
  const pinchScale = useSharedValue(1);

  const commitViewport = useCallback((lng: number, lat: number, z: number) => {
    setCenterLng(lng);
    setCenterLat(lat);
    setZoom(clampZoom(z));
  }, []);

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panOffsetX.value },
      { translateY: panOffsetY.value },
      { scale: pinchScale.value },
    ],
  }));

  useEffect(() => {
    viewportRef.current = { lng: centerLng, lat: centerLat, zoom };
  }, [centerLng, centerLat, zoom]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setMapSize({ width, height });
  };

  const index = useMemo(() => buildClusterIndex(listings), [listings]);

  const bounds = useMemo(() => {
    if (mapSize.width === 0) return [-180, -90, 180, 90] as [number, number, number, number];
    return getBoundsFromViewport(centerLng, centerLat, zoom, mapSize.width, mapSize.height);
  }, [centerLng, centerLat, zoom, mapSize]);

  const clusters = useMemo(
    () => index.getClusters(bounds, Math.floor(zoom)),
    [index, bounds, zoom],
  );

  const nearbyPois = useMemo(
    () => (focusedListing ? getNearbyAmenities(focusedListing.lat, focusedListing.lng, 500) : []),
    [focusedListing],
  );

  const tiles = useMemo(() => {
    if (mapSize.width === 0) return [];
    return getVisibleTiles(centerLng, centerLat, zoom, mapSize.width, mapSize.height).tiles;
  }, [centerLng, centerLat, zoom, mapSize]);

  const project = useCallback(
    (lng: number, lat: number) => {
      if (mapSize.width === 0) return null;
      return lngLatToScreen(lng, lat, centerLng, centerLat, zoom, mapSize.width, mapSize.height);
    },
    [centerLng, centerLat, zoom, mapSize],
  );

  const unproject = useCallback(
    (x: number, y: number) => {
      if (mapSize.width === 0) return null;
      const centerPx = lngLatToPixel(centerLng, centerLat, zoom);
      const lngLat = pixelToLngLat(centerPx.x - mapSize.width / 2 + x, centerPx.y - mapSize.height / 2 + y, zoom);
      return lngLat;
    },
    [centerLng, centerLat, zoom, mapSize],
  );

  useImperativeHandle(
    ref,
    () => ({
      flyToCoverage: (c) => {
        setCenterLng(c.longitude);
        setCenterLat(c.latitude);
        setZoom(clampZoom(c.zoom));
      },
      flyToArea: (area: MapAreaPolygon) => {
        const center = polygonCenter(area);
        setCenterLng(center.lng);
        setCenterLat(center.lat);
        setZoom(clampZoom(zoomForPolygonBounds(area, mapSize.width || 360, mapSize.height || 640)));
      },
      getViewport: () => {
        if (mapSize.width === 0) return null;
        return {
          centerLng,
          centerLat,
          zoom,
          width: mapSize.width,
          height: mapSize.height,
        };
      },
      project,
      unproject,
    }),
    [centerLng, centerLat, zoom, mapSize, project, unproject],
  );

  const getScreenPosition = project;

  const onClusterPress = useCallback((lng: number, lat: number) => {
    setCenterLng(lng);
    setCenterLat(lat);
    setZoom((z) => clampZoom(z + 2));
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(drawMode ? false : true)
    .minDistance(MAP_PAN_GESTURE.minDistance)
    .onBegin(() => {
      panOrigin.current = { lng: viewportRef.current.lng, lat: viewportRef.current.lat };
    })
    .onUpdate((e) => {
      panOffsetX.value = e.translationX;
      panOffsetY.value = e.translationY;
    })
    .onFinalize((e) => {
      const z = viewportRef.current.zoom;
      const originPx = lngLatToPixel(panOrigin.current.lng, panOrigin.current.lat, z);
      const next = pixelToLngLat(originPx.x - e.translationX, originPx.y - e.translationY, z);
      runOnJS(commitViewport)(next.lng, next.lat, z);
      panOffsetX.value = 0;
      panOffsetY.value = 0;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(drawMode ? false : true)
    .onBegin(() => {
      pinchBaseZoom.current = viewportRef.current.zoom;
    })
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onFinalize((e) => {
      const nextZoom = clampZoom(pinchBaseZoom.current + Math.log2(e.scale));
      runOnJS(commitViewport)(viewportRef.current.lng, viewportRef.current.lat, nextZoom);
      pinchScale.value = 1;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const mapContent = (
    <View
      style={styles.container}
      onLayout={onLayout}
      pointerEvents={drawMode ? 'none' : 'auto'}
    >
      <Animated.View style={[styles.mapSurface, animatedMapStyle]}>
      {tiles.map((tile) => {
        const pos = tileToScreen(tile.x, tile.y, centerLng, centerLat, zoom, mapSize.width, mapSize.height);
        return (
          <Image
            key={`${tile.z}-${tile.x}-${tile.y}`}
            source={{ uri: getRasterTileUrl(tile.z, tile.x, tile.y, retina) }}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: pos.size,
              height: pos.size,
            }}
            resizeMode="stretch"
          />
        );
      })}
      <DistrictBoundariesOverlay
        coverage={coverage}
        width={mapSize.width}
        height={mapSize.height}
        project={getScreenPosition}
      />
      <DistrictLabelsOverlay
        coverage={coverage}
        zoom={zoom}
        districtDetail={districtDetail}
        project={getScreenPosition}
      />
      {searchArea && !drawMode ? (
        <MapAreaHighlightOverlay
          area={searchArea}
          width={mapSize.width}
          height={mapSize.height}
          project={getScreenPosition}
        />
      ) : null}
      {showMarkers && !drawMode && listings.length > 0 ? (
        <View style={styles.markers} pointerEvents="box-none">
          <MapMarkersLayer
            clusters={clusters}
            zoom={zoom}
            categoryColors={categoryColors}
            getScreenPosition={getScreenPosition}
            onListingPress={onListingPress}
            onClusterPress={onClusterPress}
          />
        </View>
      ) : null}
      {focusedListing && !drawMode ? (
        <View style={styles.markers} pointerEvents="box-none">
          <NeighborhoodMarkersLayer pois={nearbyPois} getScreenPosition={getScreenPosition} />
          {(() => {
            const screen = getScreenPosition(focusedListing.lng, focusedListing.lat);
            if (!screen) return null;
            return (
              <View
                style={[styles.focusedMarker, { left: screen.x, top: screen.y }]}
                pointerEvents="box-none"
              >
                <ListingBubble
                  price={focusedListing.price}
                  featured={focusedListing.featured}
                  accentColor={categoryColors.main}
                  onPress={() => onListingPress(focusedListing.id)}
                />
              </View>
            );
          })()}
        </View>
      ) : null}
      </Animated.View>
    </View>
  );

  return <GestureDetector gesture={composed}>{mapContent}</GestureDetector>;
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dce6f0', overflow: 'hidden' },
  mapSurface: { ...StyleSheet.absoluteFillObject },
  markers: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  focusedMarker: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 6,
  },
});
