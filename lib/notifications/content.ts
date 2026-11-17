import i18n from '@/lib/i18n';
import type { NotificationCategory } from '@/lib/notifications/types';

export type LocalNotificationKey =
  | 'expiry15'
  | 'expiry5'
  | 'delete10'
  | 'checkin'
  | 'reengagement';

const TITLE_KEYS: Record<LocalNotificationKey, string> = {
  expiry15: 'notifications.expiry15Title',
  expiry5: 'notifications.expiry5Title',
  delete10: 'notifications.delete10Title',
  checkin: 'notifications.checkinTitle',
  reengagement: 'notifications.reengagementTitle',
};

const BODY_KEYS: Record<LocalNotificationKey, string> = {
  expiry15: 'notifications.expiry15Body',
  expiry5: 'notifications.expiry5Body',
  delete10: 'notifications.delete10Body',
  checkin: 'notifications.checkinBody',
  reengagement: 'notifications.reengagementBody',
};

const CATEGORY_BY_KEY: Record<LocalNotificationKey, NotificationCategory> = {
  expiry15: 'listings',
  expiry5: 'listings',
  delete10: 'listings',
  checkin: 'checkin',
  reengagement: 'engagement',
};

export function getLocalNotificationContent(
  key: LocalNotificationKey,
  language = i18n.language,
): { title: string; body: string; category: NotificationCategory } {
  const lng = language.split('-')[0] ?? 'en';
  const t = i18n.getFixedT(lng);

  return {
    title: t(TITLE_KEYS[key]),
    body: t(BODY_KEYS[key]),
    category: CATEGORY_BY_KEY[key],
  };
}
