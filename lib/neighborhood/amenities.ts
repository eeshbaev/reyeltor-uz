export type AmenityCategory =
  | 'amenity'
  | 'government'
  | 'education'
  | 'transport'
  | 'entertainment';

export interface NeighborhoodPoi {
  id: string;
  name: string;
  nameUz: string;
  category: AmenityCategory;
  lat: number;
  lng: number;
}

/** Curated POIs across Tashkent for demo neighborhood exploration. */
export const TASHKENT_POIS: NeighborhoodPoi[] = [
  { id: 'poi-001', name: 'Minor Mosque', nameUz: 'Minor masjidi', category: 'amenity', lat: 41.3115, lng: 69.2795 },
  { id: 'poi-002', name: 'Magic City Park', nameUz: 'Magic City bog\'i', category: 'entertainment', lat: 41.3088, lng: 69.2812 },
  { id: 'poi-003', name: 'Yunusobod District Hokimiyat', nameUz: 'Yunusobod hokimligi', category: 'government', lat: 41.3142, lng: 69.2861 },
  { id: 'poi-004', name: 'School №45', nameUz: '45-sonli maktab', category: 'education', lat: 41.3095, lng: 69.2758 },
  { id: 'poi-005', name: 'Minor Metro Station', nameUz: 'Minor metro bekati', category: 'transport', lat: 41.3128, lng: 69.2771 },
  { id: 'poi-006', name: 'Milliy Bog Park', nameUz: 'Milliy bog\'', category: 'entertainment', lat: 41.3182, lng: 69.2688 },
  { id: 'poi-007', name: 'Tashkent City Mall', nameUz: 'Tashkent City savdo markazi', category: 'amenity', lat: 41.3101, lng: 69.2834 },
  { id: 'poi-008', name: 'Preschool №12', nameUz: '12-sonli bog\'cha', category: 'education', lat: 41.3072, lng: 69.2721 },
  { id: 'poi-009', name: 'Bus stop Yunusobod-3', nameUz: 'Yunusobod-3 avtobus bekati', category: 'transport', lat: 41.3136, lng: 69.2744 },
  { id: 'poi-010', name: 'Chorsu Bazaar', nameUz: 'Chorsu bozori', category: 'amenity', lat: 41.3264, lng: 69.2347 },
  { id: 'poi-011', name: 'Amir Timur Square', nameUz: 'Amir Temur maydoni', category: 'entertainment', lat: 41.3111, lng: 69.2797 },
  { id: 'poi-012', name: 'Tashkent City Administration', nameUz: 'Toshkent shahar hokimligi', category: 'government', lat: 41.2995, lng: 69.2401 },
  { id: 'poi-013', name: 'Westminster International School', nameUz: 'Westminster maktabi', category: 'education', lat: 41.2958, lng: 69.2812 },
  { id: 'poi-014', name: 'Oybek Metro', nameUz: 'Oybek metro', category: 'transport', lat: 41.2978, lng: 69.2788 },
  { id: 'poi-015', name: 'Anhor Canal Walk', nameUz: 'Anhor kanali yo\'lak', category: 'entertainment', lat: 41.3042, lng: 69.2655 },
  { id: 'poi-016', name: 'Sergeli Central Clinic', nameUz: 'Sergeli markaziy poliklinika', category: 'government', lat: 41.2646, lng: 69.2163 },
  { id: 'poi-017', name: 'Sergeli School №8', nameUz: 'Sergeli 8-maktab', category: 'education', lat: 41.2661, lng: 69.2188 },
  { id: 'poi-018', name: 'Chilanzar Metro', nameUz: 'Chilanzar metro', category: 'transport', lat: 41.2862, lng: 69.2034 },
  { id: 'poi-019', name: 'Mega Planet Mall', nameUz: 'Mega Planet', category: 'amenity', lat: 41.3255, lng: 69.2884 },
  { id: 'poi-020', name: 'Botanical Garden', nameUz: 'Botanika bog\'i', category: 'entertainment', lat: 41.3381, lng: 69.3344 },
  { id: 'poi-021', name: 'Qibray District Office', nameUz: 'Qibray hokimligi', category: 'government', lat: 41.3898, lng: 69.4654 },
  { id: 'poi-022', name: 'Qibray Bus Terminal', nameUz: 'Qibray avtovokzal', category: 'transport', lat: 41.3912, lng: 69.4621 },
  { id: 'poi-023', name: 'Zangiota Market', nameUz: 'Zangiota bozori', category: 'amenity', lat: 41.1934, lng: 69.1345 },
  { id: 'poi-024', name: 'Yakkasaroy Park', nameUz: 'Yakkasaroy bog\'i', category: 'entertainment', lat: 41.2789, lng: 69.3156 },
  { id: 'poi-025', name: 'Mirobod Kindergarten', nameUz: 'Mirobod bog\'chasi', category: 'education', lat: 41.2958, lng: 69.2812 },
  { id: 'poi-026', name: 'Retail Plaza Yunusobod', nameUz: 'Yunusobod savdo markazi', category: 'amenity', lat: 41.3120, lng: 69.2805 },
  { id: 'poi-027', name: 'Hamza Theater', nameUz: 'Hamza teatri', category: 'entertainment', lat: 41.3012, lng: 69.2523 },
  { id: 'poi-028', name: 'Olmazor Clinic', nameUz: 'Olmazor poliklinikasi', category: 'government', lat: 41.3542, lng: 69.2511 },
  { id: 'poi-029', name: 'Shaykhontohur Bazaar', nameUz: 'Shayxontohur bozori', category: 'amenity', lat: 41.3188, lng: 69.2312 },
  { id: 'poi-030', name: 'Tashkent State University', nameUz: 'TDYU', category: 'education', lat: 41.3388, lng: 69.2955 },
];

const EARTH_RADIUS_M = 6_371_000;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export interface NearbyPoi extends NeighborhoodPoi {
  distanceM: number;
}

export function getNearbyAmenities(lat: number, lng: number, radiusM = 500): NearbyPoi[] {
  return TASHKENT_POIS.map((poi) => ({
    ...poi,
    distanceM: Math.round(haversineMeters(lat, lng, poi.lat, poi.lng)),
  }))
    .filter((poi) => poi.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

export function groupAmenitiesByCategory(pois: NearbyPoi[]): Record<AmenityCategory, NearbyPoi[]> {
  const groups: Record<AmenityCategory, NearbyPoi[]> = {
    amenity: [],
    government: [],
    education: [],
    transport: [],
    entertainment: [],
  };
  for (const poi of pois) groups[poi.category].push(poi);
  return groups;
}
