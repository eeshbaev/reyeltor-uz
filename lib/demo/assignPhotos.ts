import { DEMO_PHOTO_POOLS, demoPhotoUrl, type DemoPhotoPool } from './photoCatalog';
import type { ListingWithPhotos } from '@/types';

/** Which photos each kind of demo listing gets (cover photo first). */
const RECIPES: Record<string, DemoPhotoPool[]> = {
  apartment: ['living', 'kitchen', 'bedroom', 'building'],
  condo_strata: ['living', 'kitchen', 'bedroom', 'building'],
  duplex: ['living', 'kitchen', 'bedroom', 'building'],
  multi_family: ['building', 'living', 'kitchen'],
  residential: ['living', 'kitchen', 'bedroom', 'building'],
  loft: ['loft', 'loft', 'bathroom'],
  country_house: ['house', 'living', 'kitchen'],
  mansion: ['house', 'living', 'kitchen'],
  townhouse: ['townhouse', 'living', 'bedroom'],
  parking: ['parking', 'parking'],
  office: ['office', 'office'],
  business: ['office', 'office'],
  retail: ['retail', 'retail'],
  hospitality: ['hotel', 'restaurant'],
  warehouse: ['warehouse', 'warehouse'],
  industrial: ['industrial', 'warehouse'],
};

function recipeFor(listing: Pick<ListingWithPhotos, 'category' | 'property_type'>): DemoPhotoPool[] {
  const fromType = listing.property_type ? RECIPES[listing.property_type] : undefined;
  if (fromType) return fromType;
  return listing.category === 'commercial' ? RECIPES.office : RECIPES.apartment;
}

/**
 * Gives every listing in `shown` its own photos: no photo is used twice. Listings are
 * processed in order, so the result is the same on every launch. If a pool runs out, the
 * listing keeps its bundled photos for that slot.
 */
export function assignUniqueDemoPhotos<T extends ListingWithPhotos>(shown: T[]): Map<string, T['listing_photos']> {
  const cursor: Partial<Record<DemoPhotoPool, number>> = {};
  const take = (pool: DemoPhotoPool): string | null => {
    const list = DEMO_PHOTO_POOLS[pool];
    const index = cursor[pool] ?? 0;
    if (index >= list.length) return null;
    cursor[pool] = index + 1;
    return demoPhotoUrl(list[index]);
  };

  const result = new Map<string, T['listing_photos']>();
  for (const listing of shown) {
    const urls = recipeFor(listing)
      .map(take)
      .filter((url): url is string => url !== null);
    if (urls.length === 0) continue;
    result.set(
      listing.id,
      urls.map((url, order) => ({
        id: `${listing.id}-p${order}`,
        listing_id: listing.id,
        storage_path: url,
        order_index: order,
      })),
    );
  }
  return result;
}
