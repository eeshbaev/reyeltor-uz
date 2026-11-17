import type { ListingPhoto } from '@/types';

/** Demo listing photo backed by bundled assets/listings/*.jpg (offline-safe). */
export function demoPhoto(id: string, listingId: string, photoKey: string, order: number): ListingPhoto {
  return { id, listing_id: listingId, storage_path: `local:${photoKey}`, order_index: order };
}
