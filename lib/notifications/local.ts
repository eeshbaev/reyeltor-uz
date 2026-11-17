import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import i18n from '@/lib/i18n';
import { channelIdForCategory } from '@/lib/notifications/channels';
import { getLocalNotificationContent } from '@/lib/notifications/content';
import {
  fetchNotificationPreferences,
  readStoredPermission,
  storePermission,
} from '@/lib/notifications/preferences';
import { registerPushToken } from '@/lib/notifications/push';
import { payloadForRoute } from '@/lib/notifications/routing';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types';

const LAST_OPEN_KEY = '@reyeltor/last_open';
const FAVORITE_PERMISSION_KEY = '@reyeltor/asked_fav_notif';

const LISTING_ID_PREFIX = 'listing-';
const REENGAGEMENT_ID = 'reengagement';
const CHECKIN_IDS = ['checkin-tuesday', 'checkin-thursday', 'checkin-saturday'] as const;
const CHECKIN_WEEKDAYS = [3, 5, 7] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function notificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

async function permissionGranted(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const stored = await readStoredPermission();
  if (stored === 'granted') return true;
  if (stored === 'denied') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

async function onPermissionGranted(userId?: string): Promise<boolean> {
  await storePermission(true);
  if (userId) {
    await registerPushToken(userId);
    const prefs = await fetchNotificationPreferences(userId);
    if (prefs.checkin_enabled) await scheduleCheckinReminders();
    if (prefs.engagement_enabled) await scheduleReengagement();
  } else {
    await scheduleCheckinReminders();
    await scheduleReengagement();
  }
  return true;
}

async function fetchActiveListingsForUser(userId: string): Promise<Listing[]> {
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data ?? []) as Listing[];
}

async function fetchArchivedListingsForUser(userId: string): Promise<Listing[]> {
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'archived')
    .not('deletes_at', 'is', null);
  return (data ?? []) as Listing[];
}

async function refreshListingNotificationsForCurrentUser(): Promise<void> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return;

    const userId = data.session?.user?.id;
    if (!userId) return;

    const prefs = await fetchNotificationPreferences(userId);
    if (!prefs.listings_enabled) {
      await cancelAllListingNotifications();
      return;
    }

    const listings = await fetchActiveListingsForUser(userId);
    const archived = await fetchArchivedListingsForUser(userId);
    await scheduleListingNotifications(listings, prefs.locale);
    await scheduleArchiveDeleteNotifications(archived, prefs.locale);
  } catch {
    // Offline or Supabase unreachable — local notifications are optional.
  }
}

function showPermissionAlert(
  titleKey: string,
  messageKey: string,
  userId?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(i18n.t(titleKey), i18n.t(messageKey), [
      {
        text: i18n.t('notifications.notNow'),
        style: 'cancel',
        onPress: () => {
          storePermission(false)
            .then(() => resolve(false))
            .catch((error) => {
              console.error('Failed to store notification permission:', error);
              resolve(false);
            });
        },
      },
      {
        text: i18n.t('notifications.enable'),
        onPress: () => {
          Notifications.requestPermissionsAsync()
            .then(async ({ status }) => {
              if (status === 'granted') {
                resolve(await onPermissionGranted(userId));
              } else {
                await storePermission(false);
                resolve(false);
              }
            })
            .catch(async (error) => {
              console.error('Failed to request notification permissions:', error);
              await storePermission(false);
              resolve(false);
            });
        },
      },
    ]);
  });
}

/** Show a native alert, then request OS permission. Call after first listing post. */
export async function requestNotificationPermission(userId?: string): Promise<boolean> {
  if (!notificationsSupported()) return false;

  const stored = await readStoredPermission();
  if (stored === 'granted') {
    if (userId) await registerPushToken(userId);
    return true;
  }
  if (stored === 'denied') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return onPermissionGranted(userId);
  }

  return showPermissionAlert('notifications.permissionTitle', 'notifications.permissionListings', userId);
}

/** Ask after saving a favorite (once). */
export async function requestFavoriteNotificationPermission(userId: string): Promise<boolean> {
  if (!notificationsSupported()) return false;

  const asked = await AsyncStorage.getItem(FAVORITE_PERMISSION_KEY);
  if (asked === '1') return permissionGranted();

  const stored = await readStoredPermission();
  if (stored === 'granted') {
    await AsyncStorage.setItem(FAVORITE_PERMISSION_KEY, '1');
    await registerPushToken(userId);
    return true;
  }
  if (stored === 'denied') {
    await AsyncStorage.setItem(FAVORITE_PERMISSION_KEY, '1');
    return false;
  }

  await AsyncStorage.setItem(FAVORITE_PERMISSION_KEY, '1');
  return showPermissionAlert('notifications.permissionTitle', 'notifications.permissionFavorites', userId);
}

/**
 * Ask when the user turns on alerts for a saved search. The user explicitly asked
 * to be notified, so we ask again even if they tapped "Not now" earlier.
 */
export async function requestSavedSearchNotificationPermission(userId: string): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return onPermissionGranted(userId);
  if (!canAskAgain) return false;
  return showPermissionAlert('notifications.permissionTitle', 'notifications.permissionSearches', userId);
}

export async function cancelAllListingNotifications(): Promise<void> {
  if (!notificationsSupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (item) =>
          item.identifier.startsWith(LISTING_ID_PREFIX) || item.identifier.startsWith('archive-'),
      )
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleListingNotifications(
  listings: Listing[],
  language = i18n.language,
): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await cancelAllListingNotifications();

  const now = Date.now();
  const expiry15 = getLocalNotificationContent('expiry15', language);
  const expiry5 = getLocalNotificationContent('expiry5', language);

  for (const listing of listings) {
    if (listing.status !== 'active') continue;

    const expiresAt = new Date(listing.expires_at).getTime();
    const at15 = expiresAt - 15 * MS_PER_DAY;
    const at5 = expiresAt - 5 * MS_PER_DAY;

    const data15 = payloadForRoute('listings', '/profile/my-listings');
    const data5 = payloadForRoute('listings', '/profile/my-listings');

    if (at15 > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LISTING_ID_PREFIX}${listing.id}-15d`,
        content: {
          title: expiry15.title,
          body: expiry15.body,
          data: data15,
          ...(Platform.OS === 'android' ? { channelId: channelIdForCategory('listings') } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at15),
        },
      });
    }

    if (at5 > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LISTING_ID_PREFIX}${listing.id}-5d`,
        content: {
          title: expiry5.title,
          body: expiry5.body,
          data: data5,
          ...(Platform.OS === 'android' ? { channelId: channelIdForCategory('listings') } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at5),
        },
      });
    }
  }
}

export async function scheduleArchiveDeleteNotifications(
  listings: Listing[],
  language = i18n.language,
): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith('archive-'))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  const now = Date.now();
  const content = getLocalNotificationContent('delete10', language);
  const data = payloadForRoute('listings', '/profile/my-listings');

  for (const listing of listings) {
    if (!listing.deletes_at) continue;
    const deletesAt = new Date(listing.deletes_at).getTime();
    const at10 = deletesAt - 10 * MS_PER_DAY;
    if (at10 <= now) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `archive-${listing.id}-10d`,
      content: {
        title: content.title,
        body: content.body,
        data,
        ...(Platform.OS === 'android' ? { channelId: channelIdForCategory('listings') } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(at10),
      },
    });
  }
}

export async function cancelCheckinReminders(): Promise<void> {
  if (!notificationsSupported()) return;
  await Promise.all(CHECKIN_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleCheckinReminders(language = i18n.language): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await cancelCheckinReminders();

  const content = getLocalNotificationContent('checkin', language);
  const data = payloadForRoute('checkin', '/profile/coins');

  for (let i = 0; i < CHECKIN_WEEKDAYS.length; i++) {
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_IDS[i],
      content: {
        title: content.title,
        body: content.body,
        data,
        ...(Platform.OS === 'android' ? { channelId: channelIdForCategory('checkin') } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: CHECKIN_WEEKDAYS[i],
        hour: 10,
        minute: 0,
      },
    });
  }
}

export async function cancelReengagement(): Promise<void> {
  if (!notificationsSupported()) return;
  await Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_ID);
}

export async function scheduleReengagement(language = i18n.language): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await cancelReengagement();

  const content = getLocalNotificationContent('reengagement', language);
  const data = payloadForRoute('engagement', '/(tabs)/map');

  await Notifications.scheduleNotificationAsync({
    identifier: REENGAGEMENT_ID,
    content: {
      title: content.title,
      body: content.body,
      data,
      ...(Platform.OS === 'android' ? { channelId: channelIdForCategory('engagement') } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 7 * MS_PER_DAY),
    },
  });
}

export async function trackAppOpen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
  } catch {
    // Non-critical analytics path.
  }

  // Reschedule expiry reminders in the background — can take several seconds.
  void refreshListingNotificationsForCurrentUser().catch(() => undefined);
}

export async function syncCheckinRemindersForSession(
  isLoggedIn: boolean,
  userId?: string,
): Promise<void> {
  if (!isLoggedIn || !userId) {
    await cancelCheckinReminders();
    return;
  }

  const prefs = await fetchNotificationPreferences(userId);
  if (prefs.checkin_enabled) {
    await scheduleCheckinReminders(prefs.locale);
  } else {
    await cancelCheckinReminders();
  }
}

export async function syncLocalNotificationsForPreferences(userId: string): Promise<void> {
  const prefs = await fetchNotificationPreferences(userId);

  if (prefs.listings_enabled) {
    await refreshListingNotificationsForCurrentUser();
  } else {
    await cancelAllListingNotifications();
  }

  if (prefs.checkin_enabled) {
    await scheduleCheckinReminders(prefs.locale);
  } else {
    await cancelCheckinReminders();
  }

  if (prefs.engagement_enabled) {
    await scheduleReengagement(prefs.locale);
  } else {
    await cancelReengagement();
  }
}

export async function rescheduleAllLocalNotifications(userId: string): Promise<void> {
  await syncLocalNotificationsForPreferences(userId);
}
