#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

/** App name -> OSM relation id */
const REGION_IDS = {
  Angren: 7774377,
  Bekobod: 5750396,
  'Boʻka': 5750395,
  Chinoz: 5748414,
  Qibray: 5745803,
  Ohangaron: 5745852,
  'Oqqoʻrgʻon': 5750388,
  Parkent: 5745823,
  Piskent: 5750391,
  Quyichirchiq: 5748465,
  'Toshkent tumani': 11071441,
  'Yangiyoʻl': 5748407,
  Zangiota: 4060435,
};

const REGION_BBOX = [68.55, 40.65, 70.35, 41.85];

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

function simplifyRing(ring, maxPoints = 90) {
  const deduped = [];
  for (const pt of ring) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) deduped.push(pt);
  }
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

function cleanRing(ring, bbox) {
  let filtered = ring.filter((pt) => inBbox(pt, bbox));
  if (filtered.length < 8) filtered = ring.filter((pt) => inBbox(pt, REGION_BBOX));

  const cx = filtered.reduce((s, p) => s + p[0], 0) / filtered.length;
  const cy = filtered.reduce((s, p) => s + p[1], 0) / filtered.length;
  const distances = filtered.map((pt) => Math.hypot(pt[0] - cx, pt[1] - cy)).sort((a, b) => a - b);
  const q3 = distances[Math.floor(distances.length * 0.95)] ?? distances[distances.length - 1];
  filtered = filtered.filter((pt) => Math.hypot(pt[0] - cx, pt[1] - cy) <= q3 * 1.1);

  if (filtered[0][0] !== filtered[filtered.length - 1][0] || filtered[0][1] !== filtered[filtered.length - 1][1]) {
    filtered.push(filtered[0]);
  }
  return simplifyRing(filtered);
}

function normalizePolygon(geojson, name) {
  const polys =
    geojson.type === 'Polygon'
      ? [geojson.coordinates]
      : geojson.type === 'MultiPolygon'
        ? geojson.coordinates
        : null;
  if (!polys) throw new Error(`Unsupported geometry for ${name}`);

  const best = polys
    .map((rings) => cleanRing(rings[0], REGION_BBOX))
    .filter((r) => r.length >= 4)
    .sort((a, b) => ringArea(b) - ringArea(a))[0];

  if (!best) throw new Error(`No ring for ${name}`);
  return [best];
}

const batch = JSON.parse(readFileSync(new URL('./_osm-region-batch.json', import.meta.url), 'utf8'));
const byId = new Map(batch.map((entry) => [entry.osm_id, entry]));

const features = [];
for (const [name, id] of Object.entries(REGION_IDS)) {
  const entry = byId.get(id);
  if (!entry?.geojson) {
    console.warn('Missing', name, id);
    continue;
  }
  const coords = normalizePolygon(entry.geojson, name);
  features.push({
    type: 'Feature',
    properties: { name, tier: 'region' },
    geometry: { type: 'Polygon', coordinates: coords },
  });
  console.log(name, coords[0].length, 'pts');
}

features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
writeFileSync(
  new URL('../lib/map/tashkent-region-districts.json', import.meta.url),
  JSON.stringify({ type: 'FeatureCollection', features }),
);
console.log('Wrote', features.length, 'region districts');
