import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { MapAreaPolygon } from '@/types';

const SOURCE_ID = 'search-area';
const FILL_LAYER_ID = 'search-area-fill';
const LINE_LAYER_ID = 'search-area-line';

function toGeoJson(area: MapAreaPolygon): GeoJSON.Feature {
  const ring = area.points.map((point) => [point.lng, point.lat] as [number, number]);
  if (ring.length > 0) {
    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring[ring.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      ring.push([firstLng, firstLat]);
    }
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

function removeSearchAreaLayer(map: MapLibreMap) {
  if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID);
  if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

export function syncSearchAreaLayer(map: MapLibreMap, area: MapAreaPolygon | null | undefined) {
  if (!area || area.points.length < 3) {
    removeSearchAreaLayer(map);
    return;
  }

  const data = toGeoJson(area);
  const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(SOURCE_ID, { type: 'geojson', data });
  map.addLayer({
    id: FILL_LAYER_ID,
    type: 'fill',
    source: SOURCE_ID,
    paint: {
      'fill-color': '#DC2626',
      'fill-opacity': 0.15,
    },
  });
  map.addLayer({
    id: LINE_LAYER_ID,
    type: 'line',
    source: SOURCE_ID,
    paint: {
      'line-color': '#DC2626',
      'line-width': 2.5,
    },
  });
}
