/**
 * Synthetic demo inventory for Tashkent.
 *
 * - Deterministic (seeded): the same listings on every launch and every device.
 * - Coordinates are random points inside the official district polygons — not real addresses.
 * - Prices follow the app's district averages (lib/market/defaultMarketData.ts) with noise.
 * - Never written to the database, so it can never trigger saved-search alerts, coins,
 *   seller statistics or reviews. The UI labels every one of these listings as DEMO.
 *
 * Volumes are test volumes, not claims about real market supply.
 */
import rawDistricts from '@/lib/map/tashkent-districts.json';
import {
  DEFAULT_COMMERCIAL_DISTRICT_MARKET,
  DEFAULT_RESIDENTIAL_DISTRICT_MARKET,
} from '@/lib/market/defaultMarketData';
import type { ListingWithPhotos, PropertyLevel, PropertyView } from '@/types';
// eslint-disable-next-line import/order -- local sibling module
import { demoPhoto } from './photos';

export const DEMO_DISTRICT_VOLUMES: Record<string, number> = {
  // City centre
  Shaykhontohur: 100,
  Mirobod: 100,
  Yunusobod: 100,
  Chilanzar: 100,
  Yakkasaroy: 100,
  // Other Tashkent districts (300 total)
  'Mirzo Ulugbek': 44,
  Yashnobod: 44,
  Olmazor: 44,
  Uchtepa: 43,
  Sergeli: 43,
  Yangihayot: 41,
  Bektemir: 41,
  // Appended last so the ids of all other demo listings stay the same.
  'Yangi Toshkent': 41,
};

const USD_RATE = 12_017;
const SEED = 20261110;

/** Demo agents that "own" generated listings (contact details are hidden for all of them). */
export const GENERATED_AGENT_IDS = [
  'a0000001-0000-4000-8000-000000000001',
  'a0000002-0000-4000-8000-000000000002',
  'a0000003-0000-4000-8000-000000000003',
  'a0000004-0000-4000-8000-000000000004',
  'a0000005-0000-4000-8000-000000000005',
  'a0000006-0000-4000-8000-000000000006',
];

type Ring = number[][];
interface DistrictShape {
  name: string;
  ring: Ring;
  bbox: [number, number, number, number];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function insideRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function districtShapes(): Map<string, DistrictShape> {
  const map = new Map<string, DistrictShape>();
  const features = (rawDistricts as GeoJSON.FeatureCollection<GeoJSON.Polygon, { name: string }>).features;
  for (const feature of features) {
    const ring = feature.geometry.coordinates[0];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    map.set(feature.properties.name, { name: feature.properties.name, ring, bbox: [minLng, minLat, maxLng, maxLat] });
  }
  return map;
}

const RESIDENTIAL_TYPES: Array<[string, number]> = [
  ['apartment', 52],
  ['residential', 14],
  ['condo_strata', 10],
  ['townhouse', 6],
  ['duplex', 5],
  ['loft', 5],
  ['country_house', 4],
  ['mansion', 2],
  ['parking', 2],
];

const COMMERCIAL_TYPES: Array<[string, number]> = [
  ['office', 34],
  ['retail', 30],
  ['warehouse', 12],
  ['hospitality', 10],
  ['business', 9],
  ['industrial', 5],
];

const RESIDENTIAL_PHOTOS = ['living', 'bedroom', 'apartment', 'balcony', 'kitchen', 'loft'];
const COMMERCIAL_PHOTOS: Record<string, string[]> = {
  office: ['office', 'campus'],
  retail: ['retail'],
  warehouse: ['warehouse'],
  hospitality: ['cafe'],
  business: ['office', 'retail'],
  industrial: ['warehouse'],
};

const VIEWS: PropertyView[] = ['city', 'mountain', 'river', 'park', 'road', 'playground'];

const RES_FEATURES = [
  'yevroremont',
  'yangi mebel',
  'konditsioner',
  'issiq pol',
  'lift',
  'keng balkon',
  'yopiq hovli',
  "metroga yaqin",
  "maktab va bog'cha yaqinida",
  'avtoturargoh',
  'video domofon',
  'panoramik derazalar',
  "o'rnatilgan oshxona jihozlari",
];

const COMMERCIAL_LINES: Record<string, string[]> = {
  office: ['open-space va uchrashuv xonasi', "24/7 qo'riqlash", 'rezerv generator', 'tez internet'],
  retail: ['katta vitrina', 'yuqori odam oqimi', 'alohida kirish', 'ombor xonasi'],
  warehouse: ['yuk mashinalari kirishi', 'baland shift', 'video kuzatuv', 'ofis bloki'],
  hospitality: ['jihozlangan oshxona', 'terassa', 'ventilyatsiya', 'mehmonlar uchun zal'],
  business: ['alohida bino', 'avtoturargoh', "ko'p maqsadli foydalanish", 'qulay transport'],
  industrial: ['uch fazali elektr', "yuk ko'targich", 'keng hudud', 'ishlab chiqarish uchun tayyor'],
};

const RESIDENTIAL_NAMES: Record<string, string> = {
  apartment: 'kvartira',
  residential: 'kvartira',
  condo_strata: 'kvartira (yangi turar-joy majmuasida)',
  loft: 'loft-studiya',
  townhouse: 'taunxaus',
  duplex: 'dupleks',
  country_house: 'hovli uy',
  mansion: 'hovli-villa',
};

const COMMERCIAL_NAMES: Record<string, string> = {
  office: 'ofis',
  retail: 'savdo maydoni',
  warehouse: 'ombor',
  hospitality: 'kafe/restoran binosi',
  business: 'biznes uchun bino',
  industrial: 'ishlab chiqarish binosi',
};

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Generates the demo inventory once; callers should memoize the result. */
export function generateDemoListings(): ListingWithPhotos[] {
  const rand = mulberry32(SEED);
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
  const between = (min: number, max: number) => min + rand() * (max - min);
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const weighted = (items: Array<[string, number]>) => {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    let roll = rand() * total;
    for (const [value, weight] of items) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return items[0][0];
  };
  const sample = <T,>(items: readonly T[], count: number): T[] => {
    const copy = [...items];
    const out: T[] = [];
    while (out.length < count && copy.length > 0) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  };

  const shapes = districtShapes();
  const now = Date.now();
  const listings: ListingWithPhotos[] = [];
  let index = 0;

  for (const [district, count] of Object.entries(DEMO_DISTRICT_VOLUMES)) {
    const shape = shapes.get(district);
    if (!shape) continue;
    const resMarket = DEFAULT_RESIDENTIAL_DISTRICT_MARKET[district] ?? { rentPerSqmUsd: 8, salePerSqmUsd: 1300 };
    const comMarket = DEFAULT_COMMERCIAL_DISTRICT_MARKET[district] ?? { leasePerSqmUsd: 11, salePerSqmUsd: 1400 };

    for (let n = 0; n < count; n += 1) {
      index += 1;
      const id = `l0000090-${pad(index, 4)}-4000-8000-${pad(index, 12)}`;

      let lng = 0;
      let lat = 0;
      for (let tries = 0; tries < 200; tries += 1) {
        lng = between(shape.bbox[0], shape.bbox[2]);
        lat = between(shape.bbox[1], shape.bbox[3]);
        if (insideRing(lng, lat, shape.ring)) break;
      }

      const commercial = rand() < 0.3;
      const noise = between(0.8, 1.25);
      const postedDaysAgo = Math.floor(Math.pow(rand(), 1.6) * 80);
      const posted = now - postedDaysAgo * 86_400_000;
      const base = {
        id,
        user_id: pick(GENERATED_AGENT_IDS),
        district,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        status: 'active' as const,
        archived_reason: null,
        is_featured: false,
        view_count: int(3, 420),
        posted_at: new Date(posted).toISOString(),
        last_edited_at: new Date(posted + Math.floor(rand() * Math.min(postedDaysAgo, 10)) * 86_400_000).toISOString(),
        expires_at: new Date(posted + 90 * 86_400_000).toISOString(),
        archived_at: null,
        deletes_at: null,
      };

      let listing: ListingWithPhotos;
      if (!commercial) {
        const propertyType = weighted(RESIDENTIAL_TYPES);
        const forRent = rand() < 0.55;
        const rooms =
          propertyType === 'parking'
            ? 0
            : propertyType === 'loft'
              ? int(1, 2)
              : propertyType === 'mansion'
                ? int(5, 8)
                : propertyType === 'townhouse' || propertyType === 'duplex' || propertyType === 'country_house'
                  ? int(3, 6)
                  : int(1, 4);
        const area =
          propertyType === 'parking'
            ? int(14, 20)
            : propertyType === 'mansion' || propertyType === 'country_house'
              ? int(180, 450)
              : Math.round(rooms * between(22, 32) + between(10, 25));
        const totalFloors = propertyType === 'country_house' || propertyType === 'mansion' ? int(1, 3) : int(4, 16);
        const floor = Math.min(totalFloors, int(1, totalFloors));
        const usd = forRent ? resMarket.rentPerSqmUsd * area * noise : resMarket.salePerSqmUsd * area * noise;
        const price = forRent
          ? Math.max(1_500_000, Math.round((usd * USD_RATE) / 100_000) * 100_000)
          : Math.round((usd * USD_RATE) / 5_000_000) * 5_000_000;
        const features = sample(RES_FEATURES, 3).join(', ');
        const what = propertyType === 'parking' ? 'avtoturargoh joyi' : `${rooms} xonali ${RESIDENTIAL_NAMES[propertyType] ?? 'kvartira'}`;
        const levels: PropertyLevel[] =
          floor === 1 ? ['first_floor'] : floor === totalFloors ? ['top_floor'] : floor >= totalFloors * 0.7 ? ['high_floor'] : ['mid_floor'];
        const photos = sample(RESIDENTIAL_PHOTOS, int(2, 5));
        listing = {
          ...base,
          type: forRent ? 'rent' : 'buy',
          category: 'residential',
          property_type: propertyType,
          bathrooms: rooms >= 3 ? int(1, 3) : 1,
          year_built: int(1968, 2025),
          property_views: sample(VIEWS, int(0, 2)),
          level: propertyType === 'parking' ? null : levels[0],
          price,
          rooms,
          area_m2: area,
          floor: propertyType === 'parking' ? null : floor,
          total_floors: propertyType === 'parking' ? null : totalFloors,
          description: `${district} tumanida ${what}. ${features[0].toUpperCase()}${features.slice(1)}. ${
            forRent ? "Uzoq muddatli ijaraga beriladi." : "Hujjatlar tayyor, ipoteka mumkin."
          }`,
          listing_photos: photos.map((key, order) => demoPhoto(`${id}-p${order}`, id, key, order)),
        };
      } else {
        const propertyType = weighted(COMMERCIAL_TYPES);
        const forLease = rand() < 0.6;
        const area =
          propertyType === 'warehouse' || propertyType === 'industrial'
            ? int(250, 2500)
            : propertyType === 'business'
              ? int(150, 900)
              : int(25, 320);
        const usd = forLease ? comMarket.leasePerSqmUsd * area * noise : comMarket.salePerSqmUsd * area * noise;
        const price = forLease
          ? Math.round((usd * USD_RATE) / 100_000) * 100_000
          : Math.round((usd * USD_RATE) / 5_000_000) * 5_000_000;
        const totalFloors = int(1, 12);
        const lines = sample(COMMERCIAL_LINES[propertyType] ?? COMMERCIAL_LINES.business, 2).join(', ');
        const photos = (COMMERCIAL_PHOTOS[propertyType] ?? ['office']).slice(0, int(1, 2));
        listing = {
          ...base,
          type: forLease ? 'lease' : 'buy',
          category: 'commercial',
          property_type: propertyType,
          bathrooms: int(1, 3),
          year_built: int(1975, 2025),
          property_views: [],
          level: null,
          price,
          rooms: 0,
          area_m2: area,
          floor: Math.min(totalFloors, int(1, 3)),
          total_floors: totalFloors,
          description: `${district} tumanida ${area} m² ${COMMERCIAL_NAMES[propertyType] ?? 'tijorat binosi'}: ${lines}. ${
            forLease ? 'Uzoq muddatli ijaraga.' : 'Sotiladi, hujjatlar tayyor.'
          }`,
          listing_photos: photos.map((key, order) => demoPhoto(`${id}-p${order}`, id, key, order)),
        };
      }

      listings.push(listing);
    }
  }

  return listings;
}
