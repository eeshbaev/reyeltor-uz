import type { ListingPhoto } from '@/types';

export function demoPhoto(id: string, listingId: string, url: string, order: number): ListingPhoto {
  return { id, listing_id: listingId, storage_path: `demo:${url}`, order_index: order };
}
