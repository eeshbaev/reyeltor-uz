import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { DistrictLabelsOverlay } from './DistrictLabelsOverlay.web';
import { buildClusterIndex, MapMarkersLayer } from './MapMarkersLayer.web';
import { ListingBubble } from './ListingBubble';
import { NeighborhoodMarkersLayer } from './NeighborhoodMarkersLayer.web';
import type { MapViewProps, MapViewRef } from './types';
import { TASHKENT_CENTER, TASHKENT_MAP_MAX_BOUNDS } from '@/lib/constants';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { useTheme } from '@/lib/theme';
import { getNearbyAmenities } from '@/lib/neighborhood/amenities';
import { polygonBounds } from '@/lib/map/polygon';
import { syncDistrictLayers } from '@/lib/map/districtLayers.web';
import { syncSearchAreaLayer } from '@/lib/map/searchAreaLayer.web';
import { clampZoom, MAX_ZOOM, MIN_ZOOM } from '@/lib/mapProjection';
import { getMapAttribution, getWebMapStyle, prefersRetinaMapTiles } from '@/lib/mapTiles';
import type { MapAreaPolygon } from '@/types';
import 'maplibre-gl/dist/maplibre-gl.css';

export const MapView = forwardRef<MapViewRef, MapViewProps>(function MapViewWeb(
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({
    centerLng: start.longitude,
    centerLat: start.latitude,
    zoom: clampZoom(start.zoom),
    bounds: [-180, -90, 180, 90] as [number, number, number, number],
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setMapSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    flyToCoverage: (c) => {
      mapRef.current?.flyTo({
        center: [c.longitude, c.latitude],
        zoom: clampZoom(c.zoom),
        duration: 700,
      });
    },
    flyToArea: (area: MapAreaPolygon) => {
      const map = mapRef.current;
      if (!map) return;
      const bounds = polygonBounds(area);
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 72, duration: 700, maxZoom: 17 },
      );
    },
    getViewport: () => {
      if (mapSize.width === 0) return null;
      const map = mapRef.current;
      if (!map) return null;
      const center = map.getCenter();
      return {
        centerLng: center.lng,
        centerLat: center.lat,
        zoom: map.getZoom(),
        width: mapSize.width,
        height: mapSize.height,
      };
    },
    project: (lng: number, lat: number) => {
      const map = mapRef.current;
      if (!map || !mapReady) return null;
      const point = map.project([lng, lat]);
      return { x: point.x, y: point.y };
    },
    unproject: (x: number, y: number) => {
      const map = mapRef.current;
      if (!map) return null;
      const lnglat = map.unproject([x, y]);
      return { lat: lnglat.lat, lng: lnglat.lng };
    },
  }), [mapReady, mapSize, viewport.centerLat, viewport.centerLng, viewport.zoom]);

  const index = useMemo(() => buildClusterIndex(listings), [listings]);

  const clusters = useMemo(
    () => index.getClusters(viewport.bounds, Math.floor(viewport.zoom)),
    [index, viewport],
  );

  const nearbyPois = useMemo(
    () => (focusedListing ? getNearbyAmenities(focusedListing.lat, focusedListing.lng, 500) : []),
    [focusedListing],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const [west, south, east, north] = TASHKENT_MAP_MAX_BOUNDS;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getWebMapStyle(prefersRetinaMapTiles()),
      center: [start.longitude, start.latitude],
      zoom: clampZoom(start.zoom),
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: [[west, south], [east, north]],
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: getMapAttribution() }),
      'bottom-left',
    );

    const syncViewport = () => {
      const b = map.getBounds();
      const center = map.getCenter();
      setViewport({
        centerLng: center.lng,
        centerLat: center.lat,
        zoom: map.getZoom(),
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      });
      setTick((n) => n + 1);
    };

    map.on('load', () => {
      syncDistrictLayers(map, coverage);
      setMapReady(true);
      syncViewport();
    });
    map.on('move', syncViewport);
    map.on('zoom', syncViewport);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [start.latitude, start.longitude, start.zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncDistrictLayers(map, coverage);
  }, [coverage, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (drawMode) {
      syncSearchAreaLayer(map, null);
      return;
    }
    syncSearchAreaLayer(map, searchArea);
  }, [searchArea, drawMode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (drawMode) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
    }
  }, [drawMode, mapReady]);

  const project = useCallback(
    (lng: number, lat: number) => {
      const map = mapRef.current;
      if (!map || !mapReady) return null;
      const point = map.project([lng, lat]);
      return { x: point.x, y: point.y };
    },
    [mapReady],
  );

  const getScreenPosition = (lng: number, lat: number) => project(lng, lat);

  const onClusterPress = (lng: number, lat: number) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: clampZoom(viewport.zoom + 2),
      duration: 500,
    });
  };

  const markersVisible = showMarkers && !drawMode && listings.length > 0;
  const focusVisible = focusedListing && !drawMode;
  const focusedScreen = focusVisible ? getScreenPosition(focusedListing.lng, focusedListing.lat) : null;

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        overflow: 'hidden',
        isolation: 'isolate',
        zIndex: 0,
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {mapReady ? (
        <>
          <DistrictLabelsOverlay
            coverage={coverage}
            zoom={viewport.zoom}
            districtDetail={districtDetail}
            project={project}
          />
          {markersVisible ? (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 4 }}>
              <MapMarkersLayer
                clusters={clusters}
                zoom={viewport.zoom}
                categoryColors={categoryColors}
                getScreenPosition={getScreenPosition}
                onListingPress={onListingPress}
                onClusterPress={onClusterPress}
              />
            </div>
          ) : null}
          {focusVisible ? (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 5 }}>
              <NeighborhoodMarkersLayer pois={nearbyPois} getScreenPosition={getScreenPosition} />
              {focusedScreen ? (
                <div
                  style={{
                    position: 'absolute',
                    left: focusedScreen.x,
                    top: focusedScreen.y,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    zIndex: 6,
                  }}
                >
                  <ListingBubble
                    price={focusedListing.price}
                    featured={focusedListing.featured}
                    accentColor={categoryColors.main}
                    onPress={() => onListingPress(focusedListing.id)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
});

export type { MapViewProps, MapViewRef };
