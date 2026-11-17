import * as Notifications from 'expo-notifications';
import { setupAndroidChannels } from '@/lib/notifications/channels';

let notificationHandlerConfigured = false;

export function configureNotificationHandler(): void {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** @deprecated Use setupAndroidChannels */
export async function setupAndroidChannel(): Promise<void> {
  await setupAndroidChannels();
}

export {
  cancelCheckinReminders,
  requestFavoriteNotificationPermission,
  requestNotificationPermission,
  requestSavedSearchNotificationPermission,
  rescheduleAllLocalNotifications,
  scheduleCheckinReminders,
  scheduleListingNotifications,
  scheduleReengagement,
  syncCheckinRemindersForSession,
  trackAppOpen,
} from '@/lib/notifications/local';

export {
  fetchNotificationPreferences,
  readStoredPermission,
  storePermission,
  syncNotificationLocale,
  updateNotificationPreferences,
} from '@/lib/notifications/preferences';

export { registerPushToken, syncPushRegistration, unregisterPushTokens } from '@/lib/notifications/push';

export { navigateFromNotification, payloadForRoute } from '@/lib/notifications/routing';

export { setupAndroidChannels } from '@/lib/notifications/channels';

export type { NotificationPreferences } from '@/lib/notifications/types';
