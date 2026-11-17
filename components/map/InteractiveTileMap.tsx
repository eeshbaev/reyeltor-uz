import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { AmbientMapMarkersLayer, type AmbientSelection } from './AmbientMapMarkersLayer';
import { CityPoiLayer } from './CityPoiLayer';
import { DistrictBoundariesOverlay } from './DistrictBoundariesOverlay';
import { DistrictLabelsOverlay } from './DistrictLabelsOverlay';
import { ListingBubble } from './ListingBubble';
import { MapAreaHighlightOverlay } from './MapAreaHighlightOverlay';
import { buildClusterIndex, MapMarkersLayer } from './MapMarkersLayer';
import { NeighborhoodMarkersLayer } from './NeighborhoodMarkersLayer';
import type { MapViewProps, MapViewRef } from './types';
import { MapTileImage } from '@/components/map/MapTileImage';
import { CLUSTER_MAX_ZOOM, TASHKENT_CENTER } from '@/lib/constants';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { MAP_PAN_GESTURE } from '@/lib/gestures';
import { getVisibleMapLandmarks } from '@/lib/map/ambientMapLayers';
import { getVisibleCityPois } from '@/lib/map/cityPois';
import { shouldUseDevTileProxy } from '@/lib/map/devTileProxy';
import { haversineMeters } from '@/lib/map/geo';
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
import { usesMaptilerTiles } from '@/lib/mapTiles';
import { getMapContextPois } from '@/lib/neighborhood/amenities';
import { AMBIENT_MAP_MIN_ZOOM, POI_AMBIENT_TAP_MIN_ZOOM, POI_MAP_MIN_ZOOM } from '@/lib/neighborhood/poiMapConstants';
import { useTheme } from '@/lib/theme';
import type { MapAreaPolygon } from '@/types';

function zoomForPolygonBounds(
  polygon: MapAreaPolygon,
  viewportWidth: number,
  viewportHeight: number,
): number {
  // FIX #11: Add validation for viewport dimensions (prevent division by zero)
  if (!viewportWidth || !viewportHeight) return 12;

  const bounds = polygonBounds(polygon);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latSpanM = haversineMeters(bounds.minLat, bounds.minLng, bounds.maxLat, bounds.minLng);
  const lngSpanM = haversineMeters(bounds.minLat, bounds.minLng, bounds.minLat, bounds.maxLng);

  // Prevent zero division
  const paddedLat = Math.max(latSpanM * 1.35, 0.001);
  const paddedLng = Math.max(lngSpanM * 1.35, 0.001);

  const metersPerPixelX = paddedLng / Math.max(viewportWidth, 1);
  const metersPerPixelY = paddedLat / Math.max(viewportHeight, 1);
  const metersPerPixel = Math.max(metersPerPixelX, metersPerPixelY, 40);
  const zoom = Math.log2(Math.max(156_543.03 * Math.cos((centerLat * Math.PI) / 180), 1) / metersPerPixel);

  // FIX #11: Validate result is finite
  if (!Number.isFinite(zoom)) return 12;

  return Math.min(18, Math.max(7, zoom));
}

export const InteractiveTileMap = forwardRef<MapViewRef, MapViewProps>((
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
    pinPicker,
  },
  ref,
) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const categoryColors = getCategoryColors(theme.scheme, listingCategory);
  const start = initialCenter ?? TASHKENT_CENTER;
  const [centerLng, setCenterLng] = useState(start.longitude);
  const [centerLat, setCenterLat] = useState(start.latitude);
  const [zoom, setZoom] = useState(clampZoom(start.zoom));
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [useCartoTiles, setUseCartoTiles] = useState(() => !usesMaptilerTiles());
  const [useDevTileProxy, setUseDevTileProxy] = useState(() => shouldUseDevTileProxy());
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientSelection>(null);

  const preferCartoTiles = useCartoTiles || !usesMaptilerTiles();

  const handleTileError = useCallback(() => {
    if (!useDevTileProxy) {
      setUseDevTileProxy(true);
    }
    if (!useCartoTiles && usesMaptilerTiles()) {
      setUseCartoTiles(true);
    }
  }, [useCartoTiles, useDevTileProxy]);

  // Viewport the map is currently rendered at (React state mirrors it after each commit).
  const viewportRef = useRef({
    lng: Number.isFinite(start.longitude) ? start.longitude : 69.2401,
    lat: Number.isFinite(start.latitude) ? start.latitude : 41.2995,
    zoom: clampZoom(start.zoom),
  });

  // Gestures move/scale the already-rendered map on the UI thread (no React renders while the
  // finger moves). When a gesture ends, the new viewport is committed once and the visual
  // offset is reduced by exactly the committed amount, so nothing jumps.
  const panOffsetX = useSharedValue(0);
  const panOffsetY = useSharedValue(0);
  const panBaseX = useSharedValue(0);
  const panBaseY = useSharedValue(0);
  const pinchScale = useSharedValue(1);
  /** Scale origin in layer coordinates (relative to the map centre, before the pan offset). */
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const halfW = useSharedValue(0);
  const halfH = useSharedValue(0);
  const zoomAnimating = useSharedValue(false);
  const glideSettled = useSharedValue(0);

  /** Offset already folded into a committed viewport but not yet removed from the shared values. */
  const pendingOffset = useRef<{ x: number; y: number } | 'reset'>({ x: 0, y: 0 });

  const setViewportState = useCallback((lng: number, lat: number, z: number) => {
    viewportRef.current = { lng, lat, zoom: z };
    setCenterLng(lng);
    setCenterLat(lat);
    setZoom(z);
  }, []);

  /** Absolute jump (buttons, search, cluster tap): drops any visual offset. */
  const commitViewport = useCallback(
    (lng: number, lat: number, z: number) => {
      const zClamped = clampZoom(z);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      pendingOffset.current = 'reset';
      cancelAnimation(panOffsetX);
      cancelAnimation(panOffsetY);
      cancelAnimation(pinchScale);
      setViewportState(lng, lat, zClamped);
    },
    [panOffsetX, panOffsetY, pinchScale, setViewportState],
  );

  const selectAmbientLandmark = useCallback((id: string) => {
    setSelectedAmbient((current) => (current?.id === id ? null : { id }));
  }, []);

  /** Pan finished (after momentum): fold the visual offset into the viewport. */
  const commitPan = useCallback(
    (offsetX: number, offsetY: number) => {
      const pending = pendingOffset.current === 'reset' ? { x: 0, y: 0 } : pendingOffset.current;
      const dx = offsetX - pending.x;
      const dy = offsetY - pending.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const { lng, lat, zoom: z } = viewportRef.current;
      const originPx = lngLatToPixel(lng, lat, z);
      const next = pixelToLngLat(originPx.x - dx, originPx.y - dy, z);
      if (!Number.isFinite(next.lng) || !Number.isFinite(next.lat)) return;

      pendingOffset.current = { x: pending.x + dx, y: pending.y + dy };
      setViewportState(next.lng, next.lat, z);
      setSelectedAmbient(null);
    },
    [setViewportState],
  );

  /**
   * Zoom finished: the point under the fingers (layer coords fx, fy) stays where it is.
   * scale is the visual scale shown at the end of the gesture.
   */
  const commitZoom = useCallback(
    (scale: number, fx: number, fy: number) => {
      if (!(scale > 0) || !Number.isFinite(scale)) return;
      const { lng, lat, zoom: z } = viewportRef.current;
      const nextZoom = clampZoom(z + Math.log2(scale));
      if (Math.abs(nextZoom - z) < 1e-3) {
        pinchScale.value = withTiming(1, { duration: 160 });
        return;
      }
      const k = 2 ** (nextZoom - z);
      const centerPx = lngLatToPixel(lng, lat, z);
      const focalWorldX = (centerPx.x + fx) * k;
      const focalWorldY = (centerPx.y + fy) * k;
      const next = pixelToLngLat(focalWorldX - fx, focalWorldY - fy, nextZoom);
      if (!Number.isFinite(next.lng) || !Number.isFinite(next.lat)) {
        pinchScale.value = withTiming(1, { duration: 160 });
        return;
      }
      setViewportState(next.lng, next.lat, nextZoom);
      setSelectedAmbient(null);
    },
    [pinchScale, setViewportState],
  );

  /** Smoothly zoom by `delta` levels keeping screen point (sx, sy) fixed (double tap, +/- buttons). */
  const animateZoom = useCallback(
    (delta: number, sx?: number, sy?: number) => {
      if (zoomAnimating.value) return;
      const current = viewportRef.current.zoom;
      const target = clampZoom(current + delta);
      if (Math.abs(target - current) < 1e-3) return;
      const scale = 2 ** (target - current);
      const fx = (sx ?? halfW.value) - halfW.value - panOffsetX.value;
      const fy = (sy ?? halfH.value) - halfH.value - panOffsetY.value;
      focalX.value = fx;
      focalY.value = fy;
      zoomAnimating.value = true;
      pinchScale.value = withTiming(scale, { duration: 220 }, (finished) => {
        zoomAnimating.value = false;
        if (finished) runOnJS(commitZoom)(scale, fx, fy);
      });
    },
    [commitZoom, focalX, focalY, halfH, halfW, panOffsetX, panOffsetY, pinchScale, zoomAnimating],
  );

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panOffsetX.value + focalX.value },
      { translateY: panOffsetY.value + focalY.value },
      { scale: pinchScale.value },
      { translateX: -focalX.value },
      { translateY: -focalY.value },
    ],
  }));

  // After React has drawn the committed viewport, remove what was folded into it.
  useLayoutEffect(() => {
    const pending = pendingOffset.current;
    pendingOffset.current = { x: 0, y: 0 };
    pinchScale.value = 1;
    if (pending === 'reset') {
      panOffsetX.value = 0;
      panOffsetY.value = 0;
      panBaseX.value = 0;
      panBaseY.value = 0;
      return;
    }
    if (pending.x !== 0 || pending.y !== 0) {
      panOffsetX.value -= pending.x;
      panOffsetY.value -= pending.y;
      panBaseX.value -= pending.x;
      panBaseY.value -= pending.y;
    }
  }, [centerLng, centerLat, zoom, panBaseX, panBaseY, panOffsetX, panOffsetY, pinchScale]);

  useEffect(() => {
    if (zoom < POI_AMBIENT_TAP_MIN_ZOOM) {
      setSelectedAmbient(null);
    }
  }, [zoom]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setMapSize({ width, height });
      halfW.value = width / 2;
      halfH.value = height / 2;
    }
  };

  // ✅ PERF FIX #2: Cluster index is memoized - only rebuilds when listings change
  const index = useMemo(() => {
    return buildClusterIndex(listings);
  }, [listings]);

  const bounds = useMemo(() => {
    if (mapSize.width === 0) return [-180, -90, 180, 90] as [number, number, number, number];
    return getBoundsFromViewport(centerLng, centerLat, zoom, mapSize.width, mapSize.height);
  }, [centerLng, centerLat, zoom, mapSize]);

  // ✅ PERF FIX #2: Clusters query is memoized - only recalculates when bounds/zoom change
  const clusters = useMemo(() => {
    if (!index || !bounds) {
      return [];
    }
    try {
      const result = index.getClusters(bounds, Math.floor(zoom));
      return result;
    } catch {
      // Silently handle - cluster data may not be ready yet
      // Return empty array and data will load when ready
      return [];
    }
  }, [index, bounds, zoom]);

  // ✅ PERF FIX #3: Viewport filtering - only render visible + buffer markers
  // Dramatically reduces re-renders for maps with 1000+ markers
  const visibleClusters = useMemo(() => {
    if (clusters.length === 0) return [];

    // Add 10% buffer around viewport for smoother panning
    const bufferLat = (bounds[3] - bounds[1]) * 0.1;
    const bufferLng = (bounds[2] - bounds[0]) * 0.1;

    const bufferedBounds = [
      bounds[0] - bufferLng,  // west
      bounds[1] - bufferLat,  // south
      bounds[2] + bufferLng,  // east
      bounds[3] + bufferLat,  // north
    ];

    const filtered = clusters.filter((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      return (
        lng >= bufferedBounds[0] &&
        lng <= bufferedBounds[2] &&
        lat >= bufferedBounds[1] &&
        lat <= bufferedBounds[3]
      );
    });

    return filtered;
  }, [clusters, bounds]);

  const contextPois = useMemo(() => {
    if (drawMode || !focusedListing || zoom < POI_MAP_MIN_ZOOM) return [];
    return getMapContextPois(focusedListing.lat, focusedListing.lng);
  }, [drawMode, focusedListing, zoom]);

  const visibleLandmarks = useMemo(() => {
    if (drawMode || zoom < AMBIENT_MAP_MIN_ZOOM || mapSize.width === 0) return [];
    return getVisibleMapLandmarks(bounds, zoom);
  }, [bounds, drawMode, mapSize.width, zoom]);

  // Tiles nearest the centre first: they load first (the loader runs a few at a time).
  const sortByDistance = useCallback(
    <T extends { x: number; y: number; z: number }>(list: T[]): T[] => {
      const c = lngLatToPixel(centerLng, centerLat, list[0]?.z ?? Math.floor(zoom));
      const cx = c.x / 256 - 0.5;
      const cy = c.y / 256 - 0.5;
      return [...list].sort((a, b) => (a.x - cx) ** 2 + (a.y - cy) ** 2 - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
    },
    [centerLat, centerLng, zoom],
  );

  // Schools, hospitals, parks, museums... at street level.
  const cityPois = useMemo(() => {
    if (drawMode || mapSize.width === 0) return [];
    const focusedIds = new Set(contextPois.map((poi) => poi.id));
    return getVisibleCityPois(bounds, zoom).filter((poi) => !focusedIds.has(poi.id));
  }, [bounds, contextPois, drawMode, mapSize.width, zoom]);

  const tiles = useMemo(() => {
    if (mapSize.width === 0) return [];
    try {
      // One ring of extra tiles is enough: the map is redrawn after every gesture.
      const result = getVisibleTiles(centerLng, centerLat, zoom, mapSize.width, mapSize.height, 1);
      return sortByDistance(result?.tiles ?? []);
    } catch (err) {
      console.error('Error getting visible tiles:', err);
      return [];
    }
  }, [centerLng, centerLat, zoom, mapSize, sortByDistance]);

  // Coarser tiles underneath (one zoom level up, usually already cached) so the map never shows
  // empty patches while sharper tiles load after a zoom or a long pan.
  const underlayTiles = useMemo(() => {
    if (mapSize.width === 0 || Math.floor(zoom) <= 3) return [];
    try {
      const result = getVisibleTiles(centerLng, centerLat, zoom - 1, mapSize.width / 2, mapSize.height / 2, 1);
      return sortByDistance(result?.tiles ?? []);
    } catch {
      return [];
    }
  }, [centerLng, centerLat, zoom, mapSize, sortByDistance]);

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
        commitViewport(c.longitude, c.latitude, c.zoom);
      },
      flyToArea: (area: MapAreaPolygon) => {
        const center = polygonCenter(area);
        commitViewport(center.lng, center.lat, zoomForPolygonBounds(area, mapSize.width || 360, mapSize.height || 640));
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
      zoomBy: (delta: number) => {
        const currentZoom = viewportRef.current.zoom;
        animateZoom(clampZoom(Math.round(currentZoom + delta)) - currentZoom);
      },
      project,
      unproject,
    }),
    [centerLng, centerLat, zoom, mapSize, project, unproject, commitViewport, animateZoom],
  );

  const getScreenPosition = project;

  const onClusterPress = useCallback(
    (lng: number, lat: number) => {
      const nextZoom = clampZoom(Math.max(viewportRef.current.zoom + 2, CLUSTER_MAX_ZOOM + 1));
      commitViewport(lng, lat, nextZoom);
    },
    [commitViewport],
  );

  const handleMapTap = useCallback(
    (x: number, y: number) => {
      const coords = unproject(x, y);
      if (!coords || !pinPicker) return;
      if (pinPicker.buildingPickerMode && pinPicker.onBuildingTap) {
        pinPicker.onBuildingTap(coords.lat, coords.lng);
        return;
      }
      pinPicker.onPinChange(coords.lat, coords.lng);
    },
    [pinPicker, unproject],
  );


  const { composed } = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(!drawMode)
      .minDistance(MAP_PAN_GESTURE.minDistance)
      .activeOffsetX([-MAP_PAN_GESTURE.activeOffset, MAP_PAN_GESTURE.activeOffset])
      .activeOffsetY([-MAP_PAN_GESTURE.activeOffset, MAP_PAN_GESTURE.activeOffset])
      .maxPointers(1)
      .onStart(() => {
        // Catch a map that is still gliding and continue from where it is.
        cancelAnimation(panOffsetX);
        cancelAnimation(panOffsetY);
        panBaseX.value = panOffsetX.value;
        panBaseY.value = panOffsetY.value;
      })
      .onUpdate((e) => {
        panOffsetX.value = panBaseX.value + e.translationX;
        panOffsetY.value = panBaseY.value + e.translationY;
      })
      .onEnd((e, success) => {
        if (!success) {
          // Interrupted (e.g. a second finger started a pinch): keep the position, no glide.
          runOnJS(commitPan)(panOffsetX.value, panOffsetY.value);
          return;
        }
        // Momentum glide on the UI thread, then one commit when both axes settle.
        glideSettled.value = 0;
        const done = (finished?: boolean) => {
          'worklet';
          if (!finished) return;
          glideSettled.value += 1;
          if (glideSettled.value === 2) runOnJS(commitPan)(panOffsetX.value, panOffsetY.value);
        };
        panOffsetX.value = withDecay({ velocity: e.velocityX, deceleration: 0.994 }, done);
        panOffsetY.value = withDecay({ velocity: e.velocityY, deceleration: 0.994 }, done);
      });

    const pinch = Gesture.Pinch()
      .enabled(!drawMode)
      .onStart((e) => {
        cancelAnimation(panOffsetX);
        cancelAnimation(panOffsetY);
        // Zoom around the point between the fingers.
        focalX.value = e.focalX - halfW.value - panOffsetX.value;
        focalY.value = e.focalY - halfH.value - panOffsetY.value;
      })
      .onUpdate((e) => {
        if (e.scale > 0 && Number.isFinite(e.scale)) {
          pinchScale.value = Math.min(16, Math.max(1 / 16, e.scale));
        }
      })
      .onEnd(() => {
        runOnJS(commitZoom)(pinchScale.value, focalX.value, focalY.value);
        // Keep the panned position too (pan offset is folded in by the next pan commit).
        runOnJS(commitPan)(panOffsetX.value, panOffsetY.value);
      });

    const doubleTap = Gesture.Tap()
      .enabled(!drawMode && !pinPicker)
      .numberOfTaps(2)
      .maxDelay(250)
      .maxDistance(16)
      .onEnd((e) => {
        runOnJS(animateZoom)(1, e.x, e.y);
      });

    const tap = Gesture.Tap()
      .enabled(Boolean(pinPicker) && !drawMode)
      .maxDistance(12)
      .onEnd((e) => {
        runOnJS(handleMapTap)(e.x, e.y);
      });

    const mapGestures = Gesture.Simultaneous(
      pinch,
      pan,
      pinPicker ? tap : doubleTap,
    );

    return { composed: mapGestures };
  }, [
    animateZoom,
    commitPan,
    commitZoom,
    drawMode,
    focalX,
    focalY,
    glideSettled,
    halfH,
    halfW,
    handleMapTap,
    panBaseX,
    panBaseY,
    panOffsetX,
    panOffsetY,
    pinPicker,
    pinchScale,
  ]);

  const pinScreen = pinPicker ? project(pinPicker.lng, pinPicker.lat) : null;

  const mapTiles = (
    <>
      {underlayTiles.map((tile) => {
        // Drawn at the current zoom: each coarse tile covers twice the size.
        const pos = tileToScreen(tile.x, tile.y, centerLng, centerLat, zoom - 1, mapSize.width / 2, mapSize.height / 2);
        return (
          <MapTileImage
            key={`u-${tile.z}-${tile.x}-${tile.y}`}
            priority="low"
            z={tile.z}
            x={tile.x}
            y={tile.y}
            preferCarto={preferCartoTiles}
            useDevProxy={useDevTileProxy}
            onStrategyFailure={handleTileError}
            style={{
              position: 'absolute',
              left: pos.left * 2,
              top: pos.top * 2,
              width: pos.size * 2,
              height: pos.size * 2,
            }}
          />
        );
      })}
      {tiles.map((tile) => {
        const pos = tileToScreen(tile.x, tile.y, centerLng, centerLat, zoom, mapSize.width, mapSize.height);
        return (
          <MapTileImage
            key={`${tile.z}-${tile.x}-${tile.y}`}
            z={tile.z}
            x={tile.x}
            y={tile.y}
            preferCarto={preferCartoTiles}
            useDevProxy={useDevTileProxy}
            onStrategyFailure={handleTileError}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: pos.size,
              height: pos.size,
            }}
          />
        );
      })}
    </>
  );

  const mapOverlays = (
    <>
      <DistrictBoundariesOverlay
        coverage={coverage}
        width={mapSize.width}
        height={mapSize.height}
        project={getScreenPosition}
      />
      {searchArea && !drawMode ? (
        <View style={styles.markers} pointerEvents="none">
          <MapAreaHighlightOverlay
            area={searchArea}
            width={mapSize.width}
            height={mapSize.height}
            project={getScreenPosition}
          />
        </View>
      ) : null}
      {pinPicker?.buildingOutline ? (
        <View style={styles.markers} pointerEvents="none">
          <MapAreaHighlightOverlay
            area={pinPicker.buildingOutline}
            width={mapSize.width}
            height={mapSize.height}
            project={getScreenPosition}
          />
        </View>
      ) : null}
      {pinPicker && pinScreen ? (
        <View
          pointerEvents="none"
          style={[
            styles.pinMarker,
            {
              left: pinScreen?.x ?? 0,
              top: pinScreen?.y ?? 0,
            },
          ]}
        >
          <View style={styles.pinHead} />
          <View style={styles.pinStem} />
        </View>
      ) : null}
    </>
  );

  const showAmbientLayer = visibleLandmarks.length > 0;
  const ambientLayerProps = {
    landmarks: visibleLandmarks,
    zoom,
    selected: selectedAmbient,
    onSelect: selectAmbientLandmark,
    getScreenPosition,
  };

  const mapMarkers = (
    <>
      {showAmbientLayer && !(zoom >= POI_AMBIENT_TAP_MIN_ZOOM && !drawMode) ? (
        <View style={styles.ambientLayer} pointerEvents="none">
          <AmbientMapMarkersLayer {...ambientLayerProps} interactive={false} />
        </View>
      ) : null}
      {cityPois.length > 0 ? (
        <View style={styles.poiLayer} pointerEvents="none">
          <CityPoiLayer pois={cityPois} zoom={zoom} language={i18n.language} getScreenPosition={getScreenPosition} />
        </View>
      ) : null}
      {contextPois.length > 0 ? (
        <View style={styles.poiLayer} pointerEvents="none">
          <NeighborhoodMarkersLayer
            pois={contextPois}
            getScreenPosition={getScreenPosition}
            variant="context"
          />
        </View>
      ) : null}
      {showMarkers && !drawMode && listings.length > 0 ? (
        <View style={styles.listingMarkers} pointerEvents="box-none">
          {/* ✅ PERF FIX #3: Use visibleClusters instead of all clusters */}
          <MapMarkersLayer
            clusters={visibleClusters}
            zoom={zoom}
            categoryColors={categoryColors}
            getScreenPosition={getScreenPosition}
            onListingPress={onListingPress}
            onClusterPress={onClusterPress}
          />
        </View>
      ) : null}
      <View style={styles.districtLabelsLayer} pointerEvents="none">
        <DistrictLabelsOverlay
          coverage={coverage}
          zoom={zoom}
          districtDetail={districtDetail}
          project={getScreenPosition}
        />
      </View>
      {focusedListing && !drawMode ? (
        <View style={styles.markers} pointerEvents="box-none">
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
    </>
  );

  return (
    <View style={styles.container} onLayout={onLayout} collapsable={false}>
      <GestureDetector gesture={composed}>
        <Animated.View style={styles.mapGestureSurface} collapsable={false}>
          <Animated.View style={[styles.mapSurface, animatedMapStyle]} pointerEvents="none">
            {mapTiles}
          </Animated.View>

          <Animated.View style={[styles.mapSurface, animatedMapStyle]} pointerEvents="none">
            {mapOverlays}
          </Animated.View>

          {!drawMode ? (
            <Animated.View style={[styles.markersOverlay, animatedMapStyle]} pointerEvents="box-none">
              {mapMarkers}
            </Animated.View>
          ) : null}
        </Animated.View>
      </GestureDetector>

      {showAmbientLayer && zoom >= POI_AMBIENT_TAP_MIN_ZOOM && !drawMode ? (
        <Animated.View
          style={[styles.ambientInteractiveLayer, animatedMapStyle]}
          pointerEvents="box-none"
        >
          <AmbientMapMarkersLayer {...ambientLayerProps} interactive />
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#dce6f0', overflow: 'hidden' },
  mapGestureSurface: { flex: 1 },
  mapSurface: { ...StyleSheet.absoluteFill },
  markersOverlay: { ...StyleSheet.absoluteFill, zIndex: 5 },
  ambientLayer: { ...StyleSheet.absoluteFill, zIndex: 0 },
  ambientInteractiveLayer: { ...StyleSheet.absoluteFill, zIndex: 11 },
  poiLayer: { ...StyleSheet.absoluteFill, zIndex: 1 },
  markers: { ...StyleSheet.absoluteFill, zIndex: 3 },
  listingMarkers: { ...StyleSheet.absoluteFill, zIndex: 6 },
  districtLabelsLayer: { ...StyleSheet.absoluteFill, zIndex: 10 },
  focusedMarker: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    zIndex: 12,
  },
  pinMarker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -14 }, { translateY: -36 }],
    zIndex: 8,
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pinStem: {
    width: 4,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#DC2626',
    marginTop: -2,
  },
});
