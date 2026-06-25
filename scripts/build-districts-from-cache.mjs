#!/usr/bin/env node
/**
 * Build tashkent-districts.json from cached OSM Nominatim responses.
 * Run after fetching: scripts/_osm-batch.json and scripts/_osm-batch2.json
 */

import { readFileSync, writeFileSync } from 'fs';

const CITY_BBOX = [69.10, 41.20, 69.44, 41.40];
const SOUTH_CITY_BBOX = [69.10, 41.15, 69.44, 41.40];
const REGION_BBOX = [68.70, 40.75, 70.20, 41.70];

/** OSM display name -> app district name */
const NAME_MAP = {
  'Chilonzor Tumani': 'Chilanzar',
  'Sergeli tumani': 'Sergeli',
  'Yangi hayot Tumani': 'Yangihayot',
  'Shayhontohur Tumani': 'Shaykhontohur',
};

const SOUTH_DISTRICTS = new Set(['Bektemir', 'Sergeli', 'Yangihayot']);

function inBbox([lng, lat], bbox) {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area / 2);
}

function ringCentroid(ring) {
  let lng = 0;
  let lat = 0;
  const n = ring.length - 1;
  for (let i = 0; i < n; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / n, lat / n];
}

function dist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function dedupeRing(ring) {
  const out = [];
  for (const pt of ring) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) out.push(pt);
  }
  return out;
}

function simplifyRing(ring, maxPoints = 110) {
  const deduped = dedupeRing(ring);
  if (deduped.length <= maxPoints) {
    const closed = [...deduped];
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push(closed[0]);
    }
    return closed;
  }
  const step = Math.ceil(deduped.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < deduped.length; i += step) sampled.push(deduped[i]);
  sampled.push(sampled[0]);
  return sampled;
}

function cleanRing(ring, appName) {
  const bbox = appName === 'Zangiota' ? REGION_BBOX : SOUTH_DISTRICTS.has(appName) ? SOUTH_CITY_BBOX : CITY_BBOX;
  let filtered = ring.filter((pt) => inBbox(pt, bbox));
  if (filtered.length < 8) filtered = ring.filter((pt) => inBbox(pt, CITY_BBOX));

  const centroid = ringCentroid(filtered);
  const distances = filtered.map((pt) => dist(pt, centroid)).sort((a, b) => a - b);
  const q3 = distances[Math.floor(distances.length * 0.92)] ?? distances[distances.length - 1];
  const maxDist = Math.max(q3 * 1.15, 0.06);
  filtered = filtered.filter((pt) => dist(pt, centroid) <= maxDist);
  if (filtered.length < 4) return simplifyRing(ring);

  if (filtered[0][0] !== filtered[filtered.length - 1][0] || filtered[0][1] !== filtered[filtered.length - 1][1]) {
    filtered.push(filtered[0]);
  }
  return simplifyRing(filtered);
}

function normalizePolygon(geojson, appName) {
  const polys =
    geojson.type === 'Polygon'
      ? [geojson.coordinates]
      : geojson.type === 'MultiPolygon'
        ? geojson.coordinates
        : null;
  if (!polys) throw new Error(`Unsupported geometry: ${geojson.type}`);

  const best = polys
    .map((rings) => cleanRing(rings[0], appName))
    .filter((r) => r.length >= 4)
    .sort((a, b) => ringArea(b) - ringArea(a))[0];

  if (!best) throw new Error(`No valid ring for ${appName}`);
  return [best];
}

function appNameFromOsm(displayName) {
  return NAME_MAP[displayName] ?? displayName.replace(/ Tumani$/i, '').replace(/ tumani$/i, '');
}

function fromOsmEntry(entry) {
  const appName = appNameFromOsm(entry.name);
  return {
    type: 'Feature',
    properties: { name: appName },
    geometry: {
      type: 'Polygon',
      coordinates: normalizePolygon(entry.geojson, appName),
    },
  };
}

function cleanExistingFeature(feature) {
  const name = feature.properties.name;
  if (name === 'Hamza') return null;
  return {
    type: 'Feature',
    properties: { name, ...(feature.properties.approximate ? { approximate: true } : {}) },
    geometry: {
      type: 'Polygon',
      coordinates: normalizePolygon(feature.geometry, name),
    },
  };
}

const batch1 = JSON.parse(readFileSync(new URL('./_osm-batch.json', import.meta.url), 'utf8'));
const batch2 = JSON.parse(readFileSync(new URL('./_osm-batch2.json', import.meta.url), 'utf8'));
const existing = JSON.parse(readFileSync(new URL('../lib/map/tashkent-districts.json', import.meta.url), 'utf8'));

const fromOsm = new Map();
for (const entry of [...batch1, ...batch2]) {
  if (!entry.geojson) continue;
  const feature = fromOsmEntry(entry);
  fromOsm.set(feature.properties.name, feature);
}

const features = [];
for (const name of [
  'Bektemir', 'Chilanzar', 'Mirobod', 'Mirzo Ulugbek', 'Olmazor', 'Sergeli',
  'Shaykhontohur', 'Uchtepa', 'Yakkasaroy', 'Yashnobod', 'Yunusobod', 'Yangihayot', 'Zangiota',
]) {
  if (fromOsm.has(name)) {
    features.push(fromOsm.get(name));
    console.log(name, 'OSM', fromOsm.get(name).geometry.coordinates[0].length, 'pts');
  } else {
    const old = existing.features.find((f) => f.properties.name === name);
    const cleaned = old ? cleanExistingFeature(old) : null;
    if (cleaned) {
      features.push({ ...cleaned, properties: { name, approximate: true } });
      console.log(name, 'CLEANED-FALLBACK', cleaned.geometry.coordinates[0].length, 'pts');
    } else {
      console.warn(name, 'MISSING');
    }
  }
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
const out = { type: 'FeatureCollection', features };
writeFileSync(new URL('../lib/map/tashkent-districts.json', import.meta.url), JSON.stringify(out));
console.log(`\nWrote ${features.length} districts (Hamza removed — renamed to Yashnobod).`);
