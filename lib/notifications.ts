import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Listing } from '@/types';

const NOTIF_PERMISSION_KEY = '@reyeltor/notif_permission';
const LAST_OPEN_KEY = '@reyeltor/last_open';

const LISTING_ID_PREFIX = 'listing-';
const REENGAGEMENT_ID = 'reengagement';
const CHECKIN_IDS = ['checkin-tuesday', 'checkin-thursday', 'checkin-saturday'] as const;
const CHECKIN_WEEKDAYS = [3, 5, 7] as const; // Tue, Thu, Sat (expo: 1=Sun … 7=Sat)

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LISTING_15D_BODY = 'Your listing expires in 15 days. Edit any detail to keep it active.';
const LISTING_5D_BODY = '5 days left. A small edit resets the timer on your listing.';
const CHECKIN_BODY = 'Check in today to earn a free coin on reyeltor.uz.';
const REENGAGEMENT_BODY = "New listings added in Tashkent. See what's new on the map.";

const PERMISSION_ALERT_TITLE = 'Enable notifications';
const PERMISSION_ALERT_MESSAGE =
  'Enable notifications to get reminders before your listing expires.';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function notificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

async function readStoredPermission(): Promise<'granted' | 'denied' | null> {
  const stored = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY);
  if (stored === 'granted' || stored === 'denied') return stored;
  return null;
}

async function storePermission(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PERMISSION_KEY, granted ? 'granted' : 'denied');
}

async function permissionGranted(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const stored = await readStoredPermission();
  if (stored === 'granted') return true;
  if (stored === 'denied') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

async function fetchActiveListingsForUser(userId: string): Promise<Listing[]> {
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active');
  return (data ?? []) as Listing[];
}

async function refreshListingNotificationsForCurrentUser(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) return;
  const listings = await fetchActiveListingsForUser(userId);
  await scheduleListingNotifications(listings);
}

async function onPermissionGranted(): Promise<boolean> {
  await storePermission(true);
  await scheduleCheckinReminders();
  await scheduleReengagement();
  return true;
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Show a native alert, then request OS permission. Call only after the user's first listing post. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;

  const stored = await readStoredPermission();
  if (stored === 'granted') return true;
  if (stored === 'denied') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return onPermissionGranted();
  }

  return new Promise((resolve) => {
    Alert.alert(PERMISSION_ALERT_TITLE, PERMISSION_ALERT_MESSAGE, [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => {
          void storePermission(false).then(() => resolve(false));
        },
      },
      {
        text: 'Enable',
        onPress: () => {
          void Notifications.requestPermissionsAsync().then(async ({ status }) => {
            if (status === 'granted') {
              resolve(await onPermissionGranted());
            } else {
              await storePermission(false);
              resolve(false);
            }
          });
        },
      },
    ]);
  });
}

export async function cancelAllListingNotifications(): Promise<void> {
  if (!notificationsSupported()) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(LISTING_ID_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function scheduleListingNotifications(listings: Listing[]): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await cancelAllListingNotifications();

  const now = Date.now();

  for (const listing of listings) {
    if (listing.status !== 'active') continue;

    const expiresAt = new Date(listing.expires_at).getTime();
    const at15 = expiresAt - 15 * MS_PER_DAY;
    const at5 = expiresAt - 5 * MS_PER_DAY;

    if (at15 > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LISTING_ID_PREFIX}${listing.id}-15d`,
        content: { body: LISTING_15D_BODY },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at15),
        },
      });
    }

    if (at5 > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${LISTING_ID_PREFIX}${listing.id}-5d`,
        content: { body: LISTING_5D_BODY },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(at5),
        },
      });
    }
  }
}

export async function cancelCheckinReminders(): Promise<void> {
  if (!notificationsSupported()) return;

  await Promise.all(
    CHECKIN_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

export async function scheduleCheckinReminders(): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await cancelCheckinReminders();

  for (let i = 0; i < CHECKIN_WEEKDAYS.length; i++) {
    await Notifications.scheduleNotificationAsync({
      identifier: CHECKIN_IDS[i],
      content: { body: CHECKIN_BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: CHECKIN_WEEKDAYS[i],
        hour: 10,
        minute: 0,
      },
    });
  }
}

export async function trackAppOpen(): Promise<void> {
  await AsyncStorage.setItem(LAST_OPEN_KEY, String(Date.now()));
  await refreshListingNotificationsForCurrentUser();
}

export async function scheduleReengagement(): Promise<void> {
  if (!notificationsSupported()) return;
  if (!(await permissionGranted())) return;

  await Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_ID);

  await Notifications.scheduleNotificationAsync({
    identifier: REENGAGEMENT_ID,
    content: { body: REENGAGEMENT_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 7 * MS_PER_DAY),
    },
  });
}

/** Sync check-in reminders when auth session changes. */
export async function syncCheckinRemindersForSession(isLoggedIn: boolean): Promise<void> {
  if (isLoggedIn) {
    await scheduleCheckinReminders();
  } else {
    await cancelCheckinReminders();
  }
}
