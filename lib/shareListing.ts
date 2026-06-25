import { Platform, Share } from 'react-native';

const APP_HOME = 'https://reyeltor.uz';

export function getListingShareUrl(listingId: string): string {
  return `${APP_HOME}/listing/${listingId}`;
}

export async function shareListing(message: string, listingId: string, title: string): Promise<void> {
  const url = getListingShareUrl(listingId);
  const body = `${message}\n\n${url}\n\n${APP_HOME}`;

  await Share.share(
    Platform.select({
      ios: { message: body, url, title },
      default: { message: body, title },
    })!,
  );
}
