import { appDeepLink, LISTING_WEB_URL } from '@/lib/constants';

/** In-app deep link — only works where the app is installed. */
export function getListingAppUrl(listingId: string): string {
  return appDeepLink(`listing/${listingId}`);
}

/** Public https link to the listing page (docs/listing.html); opens in any browser. */
export function getListingWebUrl(listingId: string): string {
  return `${LISTING_WEB_URL}?id=${encodeURIComponent(listingId)}`;
}
