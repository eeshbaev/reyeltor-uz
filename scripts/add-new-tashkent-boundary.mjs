#!/usr/bin/env node
/**
 * Adds the Yangi Toshkent (New Tashkent, 13th district since March 2024) boundary from
 * OpenStreetMap to lib/map/tashkent-districts.json. Run from the project folder:
 *
 *   node scripts/add-new-tashkent-boundary.mjs
 *
 * It looks the district up on Nominatim, then Overpass, checks the area is plausible
 * (official figure: ~19,729 ha) and prints what it found before writing. Safe to re-run.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../lib/map/tashkent-districts.json', import.meta.url);
const NAME = 'Yangi Toshkent';
const UA = 'ReyeltorApp/1.0 (Reyeltor-uz boundary script)';
const SEARCH_BBOX = [68.9, 40.9, 70.0, 41.7]; // west, south, east, north
const OFFICIAL_HA = 19_729;
const NAME_PATTERN = 'Yangi Toshkent|Янги Тошкент|Новый Ташкент|New Tashkent';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Area of a lng/lat ring in hectares (equirectangular, fine at city scale). */
function ringHectares(ring) {
  const lat0 = (ring.reduce((s, p) => s + p[1], 0) / ring.length) * (Math.PI / 180);
  const mx = 111_320 * Math.cos(lat0);
  const my = 110_540;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    a += ring[i][0] * mx * ring[i + 1][1] * my - ring[i + 1][0] * mx * ring[i][1] * my;
  }
  return Math.abs(a / 2) / 10_000;
}

function closeRing(ring) {
  const [f, l] = [ring[0], ring[ring.length - 1]];
  return f[0] === l[0] && f[1] === l[1] ? ring : [...ring, f];
}

/** Douglas–Peucker simplification (tolerance in degrees). */
function simplify(points, tol) {
  if (points.length < 4) return points;
  const sq = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const segDist = (p, a, b) => {
    const l2 = sq(a, b);
    if (l2 === 0) return sq(p, a);
    let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
    t = Math.max(0, Math.min(1, t));
    return sq(p, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
  };
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i += 1) {
      const d = segDist(points[i], points[s], points[e]);
      if (d > max) [max, idx] = [d, i];
    }
    if (max > tol * tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Largest outer ring of a GeoJSON Polygon / MultiPolygon. */
function largestRing(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  let best = null;
  for (const poly of polys) {
    const ring = closeRing(poly[0]);
    if (!best || ringHectares(ring) > ringHectares(best)) best = ring;
  }
  return best;
}

/** Joins Overpass relation member ways (out geom) into closed outer rings. */
function assembleRings(members) {
  const segments = members
    .filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry?.length)
    .map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  const rings = [];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (segments.length) {
    let ring = segments.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < segments.length; i += 1) {
        const s = segments[i];
        const end = ring[ring.length - 1];
        if (same(end, s[0])) ring = ring.concat(s.slice(1));
        else if (same(end, s[s.length - 1])) ring = ring.concat(s.slice(0, -1).reverse());
        else continue;
        segments.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (same(ring[0], ring[ring.length - 1]) && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

async function fromNominatim() {
  const queries = ['Yangi Toshkent tumani', 'Yangi Toshkent', 'Янги Тошкент', 'Новый Ташкент'];
  for (const q of queries) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({
      q,
      format: 'jsonv2',
      countrycodes: 'uz',
      polygon_geojson: '1',
      viewbox: SEARCH_BBOX.join(','),
      bounded: '1',
      limit: '10',
    }).toString();
    const results = await getJson(url);
    await sleep(1100); // Nominatim usage policy: max 1 request per second
    for (const r of results) {
      if (r.osm_type !== 'relation' || !r.geojson) continue;
      if (!['boundary', 'place'].includes(r.category ?? r.class)) continue;
      const ring = largestRing(r.geojson);
      if (ring) return { ring, source: `Nominatim "${q}" → relation ${r.osm_id} (${r.display_name})` };
    }
  }
  return null;
}

async function fromOverpass() {
  const [w, s, e, n] = SEARCH_BBOX;
  const bbox = `${s},${w},${n},${e}`;
  const keys = ['name', 'name:uz', 'name:ru', 'name:en', 'official_name', 'alt_name'];
  const parts = keys.map((k) => `rel["${k}"~"${NAME_PATTERN}",i]["type"~"boundary|multipolygon"](${bbox});`).join('\n');
  const query = `[out:json][timeout:90];(\n${parts}\n);out geom;`;
  const data = await getJson('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  let best = null;
  for (const el of data.elements ?? []) {
    for (const ring of assembleRings(el.members ?? [])) {
      const ha = ringHectares(ring);
      if (!best || ha > best.ha) best = { ring, ha, source: `Overpass → relation ${el.id} (${el.tags?.name ?? '?'})` };
    }
  }
  return best;
}

async function main() {
  console.log(`Looking up ${NAME} on OpenStreetMap...`);
  let found = await fromNominatim().catch((err) => (console.warn('Nominatim failed:', err.message), null));
  if (!found) found = await fromOverpass().catch((err) => (console.warn('Overpass failed:', err.message), null));
  if (!found) {
    console.error(`\nNo boundary for ${NAME} found in OpenStreetMap. Nothing was changed.`);
    process.exit(1);
  }

  const ring = closeRing(simplify(found.ring, 0.0004));
  const ha = Math.round(ringHectares(ring));
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  console.log(`Found: ${found.source}`);
  console.log(`Points: ${found.ring.length} → ${ring.length} after simplifying`);
  console.log(`Area: ${ha.toLocaleString('en')} ha (official: ~${OFFICIAL_HA.toLocaleString('en')} ha)`);
  console.log(`Bounds: ${Math.min(...lngs).toFixed(4)},${Math.min(...lats).toFixed(4)} – ${Math.max(...lngs).toFixed(4)},${Math.max(...lats).toFixed(4)}`);

  const ratio = ha / OFFICIAL_HA;
  const approximate = ratio < 0.8 || ratio > 1.25;
  if (approximate) {
    console.warn(`\nWarning: area differs from the official figure by ${Math.round((ratio - 1) * 100)}%. Saved, but marked approximate.`);
  }

  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  data.features = data.features.filter((f) => f.properties?.name !== NAME);
  data.features.push({
    type: 'Feature',
    properties: { name: NAME, tier: 'city', ...(approximate ? { approximate: true } : {}) },
    geometry: { type: 'Polygon', coordinates: [ring.map(([x, y]) => [Number(x.toFixed(6)), Number(y.toFixed(6))])] },
  });
  writeFileSync(FILE, JSON.stringify(data));
  console.log(`\nSaved to lib/map/tashkent-districts.json. Restart the app with: npx expo start --dev-client -c`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
