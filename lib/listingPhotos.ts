import type { ImageSource } from 'expo-image';

/** Bundled fallback when a listing has no photo or remote load fails. */
export const LISTING_PHOTO_PLACEHOLDER_SOURCE: ImageSource = require('../assets/listings/placeholder.jpg');

/** @deprecated Use LISTING_PHOTO_PLACEHOLDER_SOURCE. Kept for hot-reload / stale bundle compatibility. */
export const LISTING_PHOTO_PLACEHOLDER = LISTING_PHOTO_PLACEHOLDER_SOURCE;

/** Legacy string placeholder — avoid for new code; use LISTING_PHOTO_PLACEHOLDER_SOURCE. */
export const LISTING_PHOTO_PLACEHOLDER_URI = '';

export const COMPACT_LISTING_PHOTO_HEIGHT = 136;
export const MAP_LISTING_PHOTO_HEIGHT = 138;

/** Demo / bundled listing photo keys → local assets (no network). */
export const LOCAL_LISTING_PHOTOS: Record<string, ImageSource> = {
  living: require('../assets/listings/living.jpg'),
  bedroom: require('../assets/listings/bedroom.jpg'),
  apartment: require('../assets/listings/apartment.jpg'),
  balcony: require('../assets/listings/balcony.jpg'),
  loft: require('../assets/listings/loft.jpg'),
  campus: require('../assets/listings/campus.jpg'),
  office: require('../assets/listings/office.jpg'),
  warehouse: require('../assets/listings/warehouse.jpg'),
  retail: require('../assets/listings/retail.jpg'),
  cafe: require('../assets/listings/cafe.jpg'),
  kitchen: require('../assets/listings/kitchen.jpg'),
};

export function resolveLocalListingPhoto(key: string): ImageSource {
  return LOCAL_LISTING_PHOTOS[key] ?? LISTING_PHOTO_PLACEHOLDER_SOURCE;
}

/** Normalize storage_path into an expo-image source. */
export function resolveListingPhotoSource(storagePath: string, remoteUrl?: string): ImageSource {
  if (storagePath.startsWith('local:')) {
    return resolveLocalListingPhoto(storagePath.slice(6));
  }
  if (storagePath.startsWith('demo:')) {
    const demoKey = demoUrlToLocalKey(storagePath.slice(5));
    if (demoKey) return resolveLocalListingPhoto(demoKey);
    return LISTING_PHOTO_PLACEHOLDER_SOURCE;
  }
  const url = remoteUrl ?? storagePath;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { uri: url };
  }
  return LISTING_PHOTO_PLACEHOLDER_SOURCE;
}

/** Map legacy demo Unsplash URLs to bundled local photo keys. */
function demoUrlToLocalKey(url: string): string | null {
  if (url.includes('1493809842364')) return 'living';
  if (url.includes('1616594039964')) return 'bedroom';
  if (url.includes('1560448204')) return 'apartment';
  if (url.includes('1522708323590')) return 'balcony';
  if (url.includes('1484154218962')) return 'loft';
  if (url.includes('1505843513577')) return 'campus';
  if (url.includes('1497366216548')) return 'office';
  if (url.includes('1586528116311')) return 'warehouse';
  if (url.includes('1441986300917')) return 'retail';
  if (url.includes('1554118811')) return 'cafe';
  if (url.includes('1556912173')) return 'kitchen';
  return null;
}
