#!/usr/bin/env node
/**
 * Rebuild city + region district GeoJSON from OSM with accurate Douglas-Peucker simplification.
 * Run: node scripts/rebuild-all-boundaries.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const CITY_IDS = {
  Bektemir: 2447560,
  Chilanzar: 2441810,
  Mirobod: 2447634,
  'Mirzo Ulugbek': 5620904,
  Olmazor: 2441651,
  Sergeli: 2447546,
  Shaykhontohur: 2439529,
  Uchtepa: 2434059,
  Yakkasaroy: 2443769,
  Yashnobod: 1751444,
  Yunusobod: 2448072,
  Yangihayot: 12030887,
};

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

const OSM_NAME_MAP = {
  'Chilonzor Tumani': 'Chilanzar',
  'Sergeli tumani': 'Sergeli',
  'Yangi hayot Tumani': 'Yangihayot',
  'Shayhontohur Tumani': 'Shaykhontohur',
  "Yangiyo'l Tumani": 'Yangiyoʻl',
  "Bo'ka Tumani": 'Boʻka',
  'Angren shahri': 'Angren',
  'Toshkent Tumani': 'Toshkent tumani',
};

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(area / 2);
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(x - px, y - py);
}

function douglasPeucker(ring, tolerance) {
  if (ring.length <= 2) return ring;
  let maxDist = 0;
  let maxIndex = 0;
  const end = ring.length - 1;
  for (let i = 1; i < end; i += 1) {
    const d = perpendicularDistance(ring[i], ring[0], ring[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(ring.slice(0, maxIndex + 1), tolerance);
    const right = douglasPeucker(ring.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [ring[0], ring[end]];
}

function closeRing(ring) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function dedupeRing(ring) {
  const out = [];
  for (const pt of ring) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) out.push(pt);
  }
  return out;
}

function simplifyRing(ring, maxPoints = 180, tolerance = 0.00012) {
  const open = dedupeRing(ring);
  if (open.length < 4) return closeRing(open);
  let simplified = douglasPeucker(open, tolerance);
  if (simplified.length > maxPoints) {
    simplified = douglasPeucker(open, tolerance * 2);
  }
  if (simplified.length > maxPoints) {
    const step = Math.ceil(simplified.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < simplified.length; i += step) sampled.push(simplified[i]);
    simplified = sampled;
  }
  return closeRing(simplified);
}

function extractRings(geojson) {
  if (geojson.type === 'Polygon') return [geojson.coordinates[0]];
  if (geojson.type === 'MultiPolygon') {
    return geojson.coordinates.map((poly) => poly[0]);
  }
  throw new Error(`Unsupported geometry: ${geojson.type}`);
}

function normalizePolygon(geojson, maxPoints, tolerance) {
  const rings = extractRings(geojson)
    .map((ring) => simplifyRing(ring, maxPoints, tolerance))
    .filter((ring) => ring.length >= 4)
    .sort((a, b) => ringArea(b) - ringArea(a));

  if (rings.length === 0) throw new Error('No valid rings');
  return [rings[0]];
}

function appName(osmName, fallback) {
  if (OSM_NAME_MAP[osmName]) return OSM_NAME_MAP[osmName];
  if (fallback) return fallback;
  return osmName.replace(/ Tumani$/i, '').replace(/ tumani$/i, '').replace(/ shahri$/i, '');
}

function loadOsmBatch(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

function buildCollection(entries, idMap, tier, maxPoints, tolerance) {
  const byId = new Map(entries.map((e) => [e.osm_id, e]));
  const features = [];

  for (const [name, id] of Object.entries(idMap)) {
    const entry = byId.get(id);
    if (!entry?.geojson) {
      console.warn(`  MISSING ${name} (R${id})`);
      continue;
    }
    const coords = normalizePolygon(entry.geojson, maxPoints, tolerance);
    features.push({
      type: 'Feature',
      properties: { name: appName(entry.name, name), tier },
      geometry: { type: 'Polygon', coordinates: coords },
    });
    console.log(`  ${name}: ${coords[0].length} pts (from ${entry.geojson.type})`);
  }

  features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  return { type: 'FeatureCollection', features };
}

const cityOsm = loadOsmBatch('./_osm-city-all.json');
const mirzo = loadOsmBatch('./_osm-mirzo.json');
const regionOsm = loadOsmBatch('./_osm-region-all.json');

console.log('City districts:');
const city = buildCollection([...cityOsm, ...mirzo], CITY_IDS, 'city', 240, 0.00008);

console.log('\nRegion districts:');
const region = buildCollection(regionOsm, REGION_IDS, 'region', 300, 0.00008);

const cityOut = new URL('../lib/map/tashkent-districts.json', import.meta.url);
const regionOut = new URL('../lib/map/tashkent-region-districts.json', import.meta.url);

writeFileSync(cityOut, JSON.stringify(city));
writeFileSync(regionOut, JSON.stringify(region));
console.log(`\nWrote ${city.features.length} city + ${region.features.length} region districts.`);
