import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logging/logger';
import { syncNotificationLocale } from '@/lib/notifications/preferences';
import { supabase } from '@/lib/supabase';

function notificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

export async function registerPushToken(userId: string): Promise<string | null> {
  if (!notificationsSupported()) return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    logger.warn('Missing EAS projectId — cannot register Expo push token', {
      context: 'registerPushToken',
    });
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = token.data;

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,expo_push_token' },
    );

    await syncNotificationLocale(userId, i18n.language);
    return expoPushToken;
  } catch (error) {
    logger.error('Push token registration failed', error, {
      context: 'registerPushToken',
    });
    return null;
  }
}

export async function unregisterPushTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error('Failed to unregister push tokens', error, {
      context: 'unregisterPushTokens',
    });
    // Don't throw - this is a cleanup operation
  }
}

export async function syncPushRegistration(userId: string | null): Promise<void> {
  if (!userId) return;
  await registerPushToken(userId);
}
