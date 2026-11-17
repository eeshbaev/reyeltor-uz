export type NotificationCategory = 'listings' | 'favorites' | 'engagement' | 'checkin' | 'searches';

export type NotificationRoute =
  | '/profile/my-listings'
  | '/profile/coins'
  | '/(tabs)/map'
  | '/(tabs)/favorites'
  | { pathname: '/listing/[id]'; params: { id: string } };

export interface NotificationPayload {
  category: NotificationCategory;
  route: string;
  listingId?: string;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  user_id: string;
  listings_enabled: boolean;
  favorites_enabled: boolean;
  engagement_enabled: boolean;
  checkin_enabled: boolean;
  locale: string;
  updated_at: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'user_id' | 'updated_at'> = {
  listings_enabled: true,
  favorites_enabled: true,
  engagement_enabled: true,
  checkin_enabled: true,
  locale: 'en',
};
