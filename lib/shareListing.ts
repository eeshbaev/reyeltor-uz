import type { TFunction } from 'i18next';
import { shareViaSystem } from '@/lib/growth/shareChannels';
import { buildListingShareText, computePriceDropPercent, type ListingShareContext } from '@/lib/growth/shareMessage';
import type { ListingWithPhotos, PriceHistoryEntry } from '@/types';

export { getListingAppUrl, getListingWebUrl as getListingShareUrl } from '@/lib/listingLinks';

export function buildListingSharePayload(
  listing: ListingWithPhotos,
  formatPrice: (price: number) => string,
  t: TFunction,
  options: ListingShareContext & { priceHistory?: PriceHistoryEntry[] } = {},
): { title: string; message: string } {
  const priceDropPercent =
    options.priceDropPercent ??
    (options.priceHistory ? computePriceDropPercent(options.priceHistory) : null);

  return {
    title: t('listing.shareTitle'),
    message: buildListingShareText(listing, formatPrice, t, {
      priceDropPercent,
      saveCount: options.saveCount,
    }),
  };
}

/** @deprecated Use ShareSheet with buildListingSharePayload instead. */
export async function shareListing(message: string, listingId: string, title: string): Promise<void> {
  void listingId;
  await shareViaSystem(message, title);
}
