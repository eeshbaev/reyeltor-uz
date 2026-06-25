import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { CITY_BOUNDARY_STYLE, REGION_BOUNDARY_STYLE } from '@/lib/map/boundaryConstants';
import { getCityDistrictCollection, getRegionDistrictCollection } from '@/lib/map/districtBoundaries';
import type { MapCoverage } from '@/lib/constants';

const CITY_SOURCE_ID = 'tashkent-city-districts';
const REGION_SOURCE_ID = 'tashkent-region-districts';
const CITY_FILL_LAYER_ID = 'tashkent-city-fill';
const CITY_LINE_LAYER_ID = 'tashkent-city-line';
const REGION_FILL_LAYER_ID = 'tashkent-region-fill';
const REGION_LINE_LAYER_ID = 'tashkent-region-line';

const ALL_LAYER_IDS = [
  CITY_LINE_LAYER_ID,
  REGION_LINE_LAYER_ID,
  CITY_FILL_LAYER_ID,
  REGION_FILL_LAYER_ID,
];
const ALL_SOURCE_IDS = [CITY_SOURCE_ID, REGION_SOURCE_ID];

function addBoundaryLayers(map: MapLibreMap, coverage: MapCoverage) {
  const cityData = getCityDistrictCollection();
  const regionData =
    coverage === 'region' ? getRegionDistrictCollection() : { type: 'FeatureCollection' as const, features: [] };

  map.addSource(CITY_SOURCE_ID, { type: 'geojson', data: cityData });
  map.addSource(REGION_SOURCE_ID, { type: 'geojson', data: regionData });

  map.addLayer({
    id: REGION_FILL_LAYER_ID,
    type: 'fill',
    source: REGION_SOURCE_ID,
    paint: {
      'fill-color': '#d97706',
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.03, 10, 0.06, 14, 0.08],
    },
  });

  map.addLayer({
    id: CITY_FILL_LAYER_ID,
    type: 'fill',
    source: CITY_SOURCE_ID,
    paint: {
      'fill-color': '#2563eb',
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.04, 11, 0.07, 14, 0.1],
    },
  });

  map.addLayer({
    id: REGION_LINE_LAYER_ID,
    type: 'line',
    source: REGION_SOURCE_ID,
    paint: {
      'line-color': REGION_BOUNDARY_STYLE.stroke,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.6, 16, 2],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 0.7, 15, 0.85],
      'line-dasharray': [2, 1.5],
    },
  });

  map.addLayer({
    id: CITY_LINE_LAYER_ID,
    type: 'line',
    source: CITY_SOURCE_ID,
    paint: {
      'line-color': CITY_BOUNDARY_STYLE.stroke,
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 1.8, 16, 2.4],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.45, 12, 0.65, 15, 0.8],
    },
  });
}

export function syncDistrictLayers(map: MapLibreMap, coverage: MapCoverage) {
  const cityData = getCityDistrictCollection();
  const regionData =
    coverage === 'region' ? getRegionDistrictCollection() : { type: 'FeatureCollection' as const, features: [] };

  if (map.getSource(CITY_SOURCE_ID)) {
    (map.getSource(CITY_SOURCE_ID) as GeoJSONSource).setData(cityData);
    (map.getSource(REGION_SOURCE_ID) as GeoJSONSource).setData(regionData);
    return;
  }

  addBoundaryLayers(map, coverage);
}

export function removeDistrictLayers(map: MapLibreMap) {
  for (const id of ALL_LAYER_IDS) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ALL_SOURCE_IDS) {
    if (map.getSource(id)) map.removeSource(id);
  }
}
