import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationCategory } from '@/lib/notifications/types';

const CHANNELS: Record<NotificationCategory, { id: string; name: string; description: string }> = {
  listings: {
    id: 'listings',
    name: 'Listings',
    description: 'Expiry and archive reminders for your posts',
  },
  favorites: {
    id: 'favorites',
    name: 'Favorites',
    description: 'Price changes on saved listings',
  },
  engagement: {
    id: 'engagement',
    name: 'Updates',
    description: 'New listings and app updates',
  },
  checkin: {
    id: 'checkin',
    name: 'Check-in',
    description: 'Free coin check-in reminders',
  },
  searches: {
    id: 'searches',
    name: 'Saved searches',
    description: 'New listings matching your saved searches',
  },
};

export function channelIdForCategory(category: NotificationCategory): string {
  return CHANNELS[category].id;
}

/** Register Android notification channels (no-op on iOS). */
export async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    Object.values(CHANNELS).map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  );
}
