import {
  TASHKENT_CITY_DISTRICTS,
  TASHKENT_REGION_DISTRICTS,
  type MapCoverage,
} from '@/lib/constants';
import rawCityDistricts from './tashkent-districts.json';
import rawRegionDistricts from './tashkent-region-districts.json';

export type BoundaryTier = 'city' | 'region';

export interface DistrictProperties {
  name: string;
  tier: BoundaryTier;
  approximate?: boolean;
  labelLng: number;
  labelLat: number;
}

export type DistrictPolygon = GeoJSON.Feature<GeoJSON.Polygon, DistrictProperties>;

function ringCentroid(ring: number[][]): [number, number] {
  let lng = 0;
  let lat = 0;
  const count = ring.length - 1;
  if (count <= 0) return [0, 0];
  for (let i = 0; i < count; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / count, lat / count];
}

function withLabel(
  feature: GeoJSON.Feature<GeoJSON.Polygon, { name: string; approximate?: boolean; tier?: BoundaryTier }>,
  tier: BoundaryTier,
): DistrictPolygon {
  const [labelLng, labelLat] = ringCentroid(feature.geometry.coordinates[0]);
  return {
    ...feature,
    properties: {
      name: feature.properties.name,
      tier,
      approximate: feature.properties.approximate,
      labelLng,
      labelLat,
    },
  };
}

const CITY_FEATURES = (
  rawCityDistricts as GeoJSON.FeatureCollection<GeoJSON.Polygon, { name: string; approximate?: boolean }>
).features.map((f) => withLabel(f, 'city'));

const REGION_FEATURES = (
  rawRegionDistricts as GeoJSON.FeatureCollection<GeoJSON.Polygon, { name: string }>
).features.map((f) => withLabel(f, 'region'));

function filterByCoverage(features: DistrictPolygon[], coverage: MapCoverage): DistrictPolygon[] {
  const citySet = new Set<string>(TASHKENT_CITY_DISTRICTS);
  const regionSet = new Set<string>(TASHKENT_REGION_DISTRICTS);
  return features.filter((f) => {
    if (f.properties.tier === 'city') return citySet.has(f.properties.name);
    return coverage === 'region' && regionSet.has(f.properties.name);
  });
}

export function getCityDistrictCollection(): GeoJSON.FeatureCollection<GeoJSON.Polygon, DistrictProperties> {
  return { type: 'FeatureCollection', features: filterByCoverage(CITY_FEATURES, 'city') };
}

export function getRegionDistrictCollection(): GeoJSON.FeatureCollection<GeoJSON.Polygon, DistrictProperties> {
  return { type: 'FeatureCollection', features: filterByCoverage(REGION_FEATURES, 'region') };
}

export function getDistrictCollection(coverage: MapCoverage): GeoJSON.FeatureCollection<GeoJSON.Polygon, DistrictProperties> {
  const city = filterByCoverage(CITY_FEATURES, coverage);
  const region = coverage === 'region' ? filterByCoverage(REGION_FEATURES, coverage) : [];
  return { type: 'FeatureCollection', features: [...city, ...region] };
}

export function getDistrictLabelPoints(
  coverage: MapCoverage,
  detailForDistrict: (name: string) => string | null = () => null,
): GeoJSON.FeatureCollection {
  const collection = getDistrictCollection(coverage);
  return {
    type: 'FeatureCollection',
    features: collection.features.map((f) => {
      const name = f.properties.name;
      const detail = detailForDistrict(name);
      const showMarket = detail != null && f.properties.tier === 'city';
      return {
        type: 'Feature' as const,
        properties: {
          name,
          tier: f.properties.tier,
          detail: detail ?? name,
          showMarket: showMarket ? 1 : 0,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [f.properties.labelLng, f.properties.labelLat],
        },
      };
    }),
  };
}
