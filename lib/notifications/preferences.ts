import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';
import { logger } from '@/lib/logging/logger';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/notifications/types';
import { supabase } from '@/lib/supabase';
import { isMissingSchemaError } from '@/lib/supabase/schemaErrors';

const PERMISSION_KEY = '@reyeltor/notif_permission';

export async function readStoredPermission(): Promise<'granted' | 'denied' | null> {
  const stored = await AsyncStorage.getItem(PERMISSION_KEY);
  if (stored === 'granted' || stored === 'denied') return stored;
  return null;
}

export async function storePermission(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(PERMISSION_KEY, granted ? 'granted' : 'denied');
}

function buildDefaultNotificationPreferences(userId: string): NotificationPreferences {
  const locale = i18n.language.split('-')[0] ?? 'en';
  return {
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    locale,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const fallback = buildDefaultNotificationPreferences(userId);

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error.message)) {
      logger.debug('notification_preferences table missing — using local defaults', {
        context: 'fetchNotificationPreferences',
      });
      return fallback;
    }
    logger.warn('Fetch notification preferences failed', {
      context: 'fetchNotificationPreferences',
      extra: { message: error.message },
    });
  }

  if (data) return data as NotificationPreferences;

  const { data: created, error: upsertError } = await supabase
    .from('notification_preferences')
    .upsert(fallback, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (upsertError) {
    if (isMissingSchemaError(upsertError.message)) {
      return fallback;
    }
    logger.warn('Create notification preferences failed', {
      context: 'fetchNotificationPreferences',
      extra: { message: upsertError.message },
    });
    return fallback;
  }

  return (created ?? fallback) as NotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) {
    if (isMissingSchemaError(error.message)) {
      throw new Error('Notification preferences are not configured on the server yet.');
    }
    throw error;
  }

  if (!data) {
    throw new Error('Failed to update notification preferences');
  }

  return data as NotificationPreferences;
}

export async function syncNotificationLocale(userId: string, locale: string): Promise<void> {
  await updateNotificationPreferences(userId, { locale: locale.split('-')[0] ?? 'en' });
}
