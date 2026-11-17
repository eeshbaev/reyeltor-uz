#!/usr/bin/env node
/**
 * Fetches OpenStreetMap POIs for greater Tashkent and writes tashkentPois.ts.
 * Run: npm run build:tashkent-pois
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../lib/neighborhood/tashkentPois.ts');

// Greater Tashkent incl. Yangihayot and Yangi Toshkent (south, north-east).
const BBOX = '41.10,69.05,41.48,69.62';
// nwr + "out center": most schools, hospitals and parks are mapped as areas, not points.
// Split into small queries: one big query times out on the public servers.
const QUERIES = [
  `nwr["amenity"~"^(school|kindergarten|college|university)$"](${BBOX});`,
  `nwr["amenity"~"^(hospital|clinic|doctors)$"](${BBOX});`,
  `nwr["amenity"="pharmacy"](${BBOX});`,
  `nwr["amenity"~"^(marketplace|library|theatre|place_of_worship)$"](${BBOX});`,
  `nwr["shop"~"^(supermarket|mall|department_store)$"](${BBOX});`,
  `nwr["leisure"~"^(park|garden|sports_centre|stadium|water_park)$"](${BBOX});`,
  `nwr["tourism"~"^(museum|attraction|zoo|theme_park)$"](${BBOX});
   nwr["railway"="station"]["station"="subway"](${BBOX});
   nwr["public_transport"="station"]["subway"="yes"](${BBOX});`,
].map((body) => `[out:json][timeout:90];(${body});out center tags;`);

// Public Overpass servers; if one is busy (HTML error page), the next one is tried.
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runQuery(query, label) {
  for (let attempt = 0; attempt < SERVERS.length * 2; attempt += 1) {
    const server = SERVERS[attempt % SERVERS.length];
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ReyeltorApp/1.0 (POI build script)' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(120_000),
      });
      const text = await res.text();
      if (res.ok && text.trimStart().startsWith('{')) {
        const data = JSON.parse(text);
        console.log(`  ${label}: ${data.elements?.length ?? 0} places (${new URL(server).host})`);
        return data.elements ?? [];
      }
      const reason = text.match(/<strong[^>]*>([^<]+)/)?.[1] ?? `HTTP ${res.status}`;
      console.warn(`  ${label}: ${new URL(server).host} busy (${reason.trim()}), trying another server...`);
    } catch (error) {
      console.warn(`  ${label}: ${new URL(server).host} failed (${error.message}), trying another server...`);
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`All Overpass servers failed for "${label}". Try again in a few minutes.`);
}

/** Fine-grained kind (icon + how early it appears on the map). */
function kindOf(tags) {
  const { amenity = '', shop = '', leisure = '', tourism = '', railway = '', station = '' } = tags;
  if (railway === 'station' && station === 'subway') return 'metro';
  if (tags.public_transport === 'station' && tags.subway === 'yes') return 'metro';
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'university', 'college', 'kindergarten', 'school', 'marketplace', 'library', 'theatre', 'place_of_worship'].includes(amenity)) return amenity;
  if (['supermarket', 'mall', 'department_store'].includes(shop)) return shop === 'department_store' ? 'mall' : shop;
  if (['park', 'garden', 'sports_centre', 'stadium', 'water_park'].includes(leisure)) return leisure;
  if (['museum', 'attraction', 'zoo', 'theme_park'].includes(tourism)) return tourism;
  return null;
}

function categorize(tags) {
  if ((tags.railway === 'station' && tags.station === 'subway') || (tags.public_transport === 'station' && tags.subway === 'yes')) {
    return 'transport';
  }
  const amenity = tags.amenity ?? '';
  const shop = tags.shop ?? '';
  const leisure = tags.leisure ?? '';
  const tourism = tags.tourism ?? '';
  const railway = tags.railway ?? '';
  const station = tags.station ?? '';

  if (['park', 'garden', 'sports_centre', 'stadium', 'water_park'].includes(leisure)) return 'park';
  if (['zoo', 'theme_park'].includes(tourism)) return 'park';
  if (['school', 'kindergarten', 'college', 'university'].includes(amenity)) return 'school';
  if (['hospital', 'clinic', 'doctors', 'pharmacy'].includes(amenity)) return 'health';

  if (
    amenity === 'marketplace' ||
    ['supermarket', 'mall', 'department_store', 'convenience', 'greengrocer', 'butcher', 'bakery'].includes(shop)
  ) {
    return 'market';
  }

  if (['museum', 'attraction', 'artwork', 'viewpoint'].includes(tourism)) return 'culture';
  if (amenity === 'library' || amenity === 'theatre' || amenity === 'place_of_worship') return 'culture';

  return null;
}

function pickName(tags) {
  for (const key of ['name:uz', 'name:en', 'name:ru', 'name', 'name:latin']) {
    const value = tags[key];
    if (value && value.trim().length >= 2) return value.trim();
  }
  return null;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function main() {
  console.log('Downloading places from OpenStreetMap...');
  const elements = [];
  for (const [index, query] of QUERIES.entries()) {
    elements.push(...(await runQuery(query, `group ${index + 1}/${QUERIES.length}`)));
    await sleep(1500); // be polite to the free servers
  }
  const data = { elements };
  const seen = new Set();
  const pois = [];

  for (const el of data.elements ?? []) {
    const point = el.type === 'node' ? { lat: el.lat, lon: el.lon } : el.center;
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    const tags = el.tags ?? {};
    const category = categorize(tags);
    if (!category) continue;

    const name = pickName(tags);
    if (!name) continue;

    const lat = Math.round(point.lat * 1e5) / 1e5;
    const lng = Math.round(point.lon * 1e5) / 1e5;
    // The same place is often mapped as both a point and an area: keep one per ~100 m.
    const key = `${category}:${name.toLowerCase()}:${Math.round(lat * 1000)}:${Math.round(lng * 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const nameUz = tags['name:uz'] || tags.name || name;
    const nameEn = tags['name:en'] || tags.name || name;

    pois.push({
      id: `osm-${el.type[0]}${el.id}`,
      kind: kindOf(tags),
      name: nameEn.slice(0, 80),
      nameUz: nameUz.slice(0, 80),
      category,
      lat,
      lng,
    });
  }

  pois.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const lines = pois.map(
    (p) =>
      `  { id: '${p.id}', name: '${esc(p.name)}', nameUz: '${esc(p.nameUz)}', category: '${p.category}', kind: '${p.kind ?? ''}', lat: ${p.lat}, lng: ${p.lng} },`,
  );

  const body = `import type { NeighborhoodPoi } from '@/lib/neighborhood/amenities';

/** OpenStreetMap POIs across Tashkent city (generated — run npm run build:tashkent-pois). */
export const TASHKENT_POIS: NeighborhoodPoi[] = [
${lines.join('\n')}
];
`;

  writeFileSync(OUT, body, 'utf8');
  console.log(`Wrote ${pois.length} POIs to ${OUT}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
