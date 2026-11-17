import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { AmbientSelection } from './AmbientMapMarkersLayer';
import { AmbientMapMarkersLayer } from './AmbientMapMarkersLayer.web';
import { DistrictLabelsOverlay } from './DistrictLabelsOverlay.web';
import { ListingBubble } from './ListingBubble';
import { buildClusterIndex, MapMarkersLayer } from './MapMarkersLayer.web';
import { NeighborhoodMarkersLayer } from './NeighborhoodMarkersLayer.web';
import type { MapViewProps, MapViewRef } from './types';
import { TASHKENT_CENTER, TASHKENT_MAP_MAX_BOUNDS } from '@/lib/constants';
import { getCategoryColors } from '@/lib/design/categoryColors';
import { getVisibleMapLandmarks } from '@/lib/map/ambientMapLayers';
import { syncDistrictLayers } from '@/lib/map/districtLayers.web';
import { polygonBounds } from '@/lib/map/polygon';
import { syncSearchAreaLayer } from '@/lib/map/searchAreaLayer.web';
import { clampZoom, MAX_ZOOM, MIN_ZOOM } from '@/lib/mapProjection';
import { getMapAttribution, getWebMapStyle, prefersRetinaMapTiles } from '@/lib/mapTiles';
import { getMapContextPois } from '@/lib/neighborhood/amenities';
import { AMBIENT_MAP_MIN_ZOOM, POI_AMBIENT_TAP_MIN_ZOOM, POI_MAP_MIN_ZOOM } from '@/lib/neighborhood/poiMapConstants';
import { useTheme } from '@/lib/theme';
import type { MapAreaPolygon } from '@/types';
import 'maplibre-gl/dist/maplibre-gl.css';

export const MapView = forwardRef<MapViewRef, MapViewProps>((
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
) => {
  const theme = useTheme();
  const categoryColors = getCategoryColors(theme.scheme, listingCategory);
  const start = initialCenter ?? TASHKENT_CENTER;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const coverageRef = useRef(coverage);
  coverageRef.current = coverage;
  const [mapReady, setMapReady] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({
    centerLng: start.longitude,
    centerLat: start.latitude,
    zoom: clampZoom(start.zoom),
    bounds: [-180, -90, 180, 90] as [number, number, number, number],
  });
  const [, setTick] = useState(0);
  const [selectedAmbient, setSelectedAmbient] = useState<AmbientSelection>(null);

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
    zoomBy: (delta: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.zoomTo(clampZoom(map.getZoom() + delta), { duration: 250 });
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
  }), [mapReady, mapSize]);

  const index = useMemo(() => buildClusterIndex(listings), [listings]);

  const clusters = useMemo(
    () => index.getClusters(viewport.bounds, Math.floor(viewport.zoom)),
    [index, viewport],
  );

  const contextPois = useMemo(() => {
    if (drawMode || !focusedListing || viewport.zoom < POI_MAP_MIN_ZOOM) return [];
    return getMapContextPois(focusedListing.lat, focusedListing.lng);
  }, [drawMode, focusedListing, viewport.zoom]);

  const visibleLandmarks = useMemo(() => {
    if (drawMode || viewport.zoom < AMBIENT_MAP_MIN_ZOOM) return [];
    return getVisibleMapLandmarks(viewport.bounds, viewport.zoom);
  }, [drawMode, viewport.bounds, viewport.zoom]);

  useEffect(() => {
    if (viewport.zoom < POI_AMBIENT_TAP_MIN_ZOOM) {
      setSelectedAmbient(null);
    }
  }, [viewport.zoom]);

  const selectAmbientLandmark = useCallback((id: string) => {
    setSelectedAmbient((current) => (current?.id === id ? null : { id }));
  }, []);

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
      syncDistrictLayers(map, coverageRef.current);
      setMapReady(true);
      syncViewport();
    });
    map.on('move', syncViewport);
    map.on('zoom', syncViewport);
    map.on('dragstart', () => {
      setSelectedAmbient(null);
    });

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
          {visibleLandmarks.length > 0 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: viewport.zoom >= POI_AMBIENT_TAP_MIN_ZOOM ? 'auto' : 'none',
                overflow: 'hidden',
                zIndex: viewport.zoom >= POI_AMBIENT_TAP_MIN_ZOOM ? 11 : 1,
              }}
            >
              <AmbientMapMarkersLayer
                landmarks={visibleLandmarks}
                zoom={viewport.zoom}
                selected={selectedAmbient}
                onSelect={selectAmbientLandmark}
                getScreenPosition={getScreenPosition}
                interactive={viewport.zoom >= POI_AMBIENT_TAP_MIN_ZOOM}
              />
            </div>
          ) : null}
          {contextPois.length > 0 ? (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 2 }}>
              <NeighborhoodMarkersLayer
                pois={contextPois}
                getScreenPosition={getScreenPosition}
                variant="context"
              />
            </div>
          ) : null}
          {markersVisible ? (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
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
          <DistrictLabelsOverlay
            coverage={coverage}
            zoom={viewport.zoom}
            districtDetail={districtDetail}
            project={project}
          />
          {focusVisible ? (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 12 }}>
              {focusedScreen ? (
                <div
                  style={{
                    position: 'absolute',
                    left: focusedScreen.x,
                    top: focusedScreen.y,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    zIndex: 12,
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
