#!/usr/bin/env node
/**
 * Rebuild tashkent-districts.json from OSM relation boundaries.
 * Run: node scripts/rebuild-districts.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const UA = 'ReyeltorApp/1.0 (reyeltor.uz)';
const CITY_BBOX = [69.08, 41.16, 69.5, 41.42]; // [west, south, east, north]
const REGION_BBOX = [68.5, 40.6, 70.4, 41.85];

/** App name -> verified OSM relation id. Hamza omitted (renamed to Yashnobod in 2014). */
const RELATION_IDS = {
  Bektemir: 2447560,
  Chilanzar: 2441810,
  Mirobod: 2447634,
  'Mirzo Ulugbek': 2448070,
  Olmazor: 2441651,
  Sergeli: 2447546,
  Shaykhontohur: 2439529,
  Uchtepa: 2434059,
  Yakkasaroy: 2443769,
  Yashnobod: 1751444,
  Yunusobod: 2448072,
  Yangihayot: 12030887,
  Zangiota: 4060435,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function filterRing(ring, bbox) {
  const filtered = ring.filter((pt) => inBbox(pt, bbox));
  if (filtered.length < 4) return ring.filter((pt) => inBbox(pt, CITY_BBOX));
  if (filtered[0][0] !== filtered[filtered.length - 1][0] || filtered[0][1] !== filtered[filtered.length - 1][1]) {
    filtered.push(filtered[0]);
  }
  return filtered;
}

function dedupeRing(ring) {
  const out = [];
  for (const pt of ring) {
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== pt[0] || prev[1] !== pt[1]) out.push(pt);
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) out.pop();
  }
  return out;
}

function simplifyRing(ring, maxPoints = 100) {
  const deduped = dedupeRing(ring);
  if (deduped.length <= maxPoints) {
    const closed = [...deduped, deduped[0]];
    return closed;
  }
  const step = Math.ceil(deduped.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < deduped.length; i += step) sampled.push(deduped[i]);
  if (sampled[0][0] !== sampled[sampled.length - 1][0] || sampled[0][1] !== sampled[sampled.length - 1][1]) {
    sampled.push(sampled[0]);
  }
  return sampled;
}

function normalizePolygon(geojson, bbox) {
  const polys =
    geojson.type === 'Polygon'
      ? [geojson.coordinates]
      : geojson.type === 'MultiPolygon'
        ? geojson.coordinates
        : null;
  if (!polys) throw new Error(`Unsupported geometry: ${geojson.type}`);

  const best = polys
    .map((rings) => filterRing(rings[0], bbox))
  .filter((r) => r.length >= 4)
    .sort((a, b) => ringArea(b) - ringArea(a))[0];

  if (!best) throw new Error('No valid ring after bbox filter');
  return [simplifyRing(best)];
}

async function fetchRelation(id) {
  const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=R${id}&format=json&polygon_geojson=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for R${id}`);
  const text = await res.text();
  if (text.startsWith('<?xml') || text.startsWith('<')) {
    throw new Error(`Rate limited or invalid response for R${id}`);
  }
  const data = JSON.parse(text);
  if (!data[0]?.geojson) throw new Error(`No geojson for R${id}`);
  return data[0];
}

function loadFallback(name) {
  const raw = JSON.parse(readFileSync(new URL('../lib/map/tashkent-districts.json', import.meta.url), 'utf8'));
  const feature = raw.features.find((f) => f.properties.name === name);
  if (!feature) return null;
  const bbox = name === 'Zangiota' ? REGION_BBOX : CITY_BBOX;
  return {
    name,
    coordinates: normalizePolygon(feature.geometry, bbox),
    source: 'cleaned-fallback',
  };
}

async function main() {
  const features = [];
  const failed = [];

  for (const [name, id] of Object.entries(RELATION_IDS)) {
    const bbox = name === 'Zangiota' ? REGION_BBOX : CITY_BBOX;
    process.stdout.write(`Fetching ${name} (R${id})... `);
    try {
      const result = await fetchRelation(id);
      const coords = normalizePolygon(result.geojson, bbox);
      features.push({
        type: 'Feature',
        properties: { name },
        geometry: { type: 'Polygon', coordinates: coords },
      });
      console.log(`${coords[0].length} pts`);
    } catch (err) {
      console.log(`FAILED (${err.message})`);
      const fallback = loadFallback(name);
      if (fallback) {
        features.push({
          type: 'Feature',
          properties: { name, approximate: true },
          geometry: { type: 'Polygon', coordinates: fallback.coordinates },
        });
        failed.push(name);
      }
    }
    await sleep(2100);
  }

  features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  const outPath = new URL('../lib/map/tashkent-districts.json', import.meta.url);
  writeFileSync(outPath, JSON.stringify({ type: 'FeatureCollection', features }));
  console.log(`\nWrote ${features.length} districts. Fallback used for: ${failed.join(', ') || 'none'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
