import { DEMO_LISTINGS } from '@/lib/demo/listings';
import { enrichListing } from '@/lib/listing';
import type { ListingWithPhotos } from '@/types';

function demoPhotosForListing(listingId: string) {
  return DEMO_LISTINGS.find((item) => item.id === listingId)?.listing_photos;
}

/** Enrich listings and backfill demo photos when rows are missing or still use legacy demo: URLs. */
export function attachListingPhotos(listings: ListingWithPhotos[]): ListingWithPhotos[] {
  return listings.map((listing) => {
    const enriched = enrichListing(listing);
    const demoPhotos = demoPhotosForListing(enriched.id);
    if (!demoPhotos?.length) return enriched;

    const hasLegacyDemoUrls = enriched.listing_photos?.some((p) => p.storage_path.startsWith('demo:'));
    if (!enriched.listing_photos?.length || hasLegacyDemoUrls) {
      return { ...enriched, listing_photos: demoPhotos };
    }
    return enriched;
  });
}
