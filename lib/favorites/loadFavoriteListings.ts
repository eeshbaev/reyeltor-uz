import { getDemoListingById, isDemoId } from '@/lib/demo';
import { readLocalFavoriteIds } from '@/lib/favorites/storage';
import { fetchListingById } from '@/lib/hooks/useListings';
import { supabase } from '@/lib/supabase';
import type { ListingWithPhotos } from '@/types';

export type FavoriteListing = ListingWithPhotos & { unavailable?: boolean };

function unavailableStub(id: string): FavoriteListing {
  return {
    id,
    unavailable: true,
    price: 0,
    rooms: 0,
    area_m2: 0,
    district: '',
    type: 'rent',
    user_id: '',
    lat: 0,
    lng: 0,
    status: 'deleted',
  } as FavoriteListing;
}

async function resolveListing(id: string): Promise<FavoriteListing | null> {
  if (isDemoId(id)) return getDemoListingById(id);
  return fetchListingById(id);
}

/** Load merged favorites from local storage and Supabase (when signed in). */
export async function loadFavoriteListings(userId?: string | null): Promise<FavoriteListing[]> {
  const localIds = await readLocalFavoriteIds();
  const merged = new Map<string, FavoriteListing>();

  for (const id of localIds) {
    const listing = await resolveListing(id);
    if (listing) merged.set(id, listing);
    else if (!isDemoId(id)) merged.set(id, unavailableStub(id));
  }

  if (!userId) {
    return [];
  }

  const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', userId);
  const remoteIds = (data ?? []).map((row) => row.listing_id);

  if (remoteIds.length === 0) {
    return [...merged.values()];
  }

  const { data: listingData } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .in('id', remoteIds);

  const found = new Map((listingData ?? []).map((listing) => [listing.id, listing as ListingWithPhotos]));

  for (const id of remoteIds) {
    if (merged.has(id)) continue;
    merged.set(id, found.get(id) ?? unavailableStub(id));
  }

  return [...merged.values()];
}
