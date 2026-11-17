import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { navigateFromNotification } from '@/lib/notifications';

/** Routes notification taps to the correct screen (cold start + foreground). */
export function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        navigateFromNotification(router, response.notification.request.content.data as Record<string, unknown>);
      })
      .catch((error) => {
        console.error('Failed to get last notification response:', error);
      });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(router, response.notification.request.content.data as Record<string, unknown>);
    });

    return () => sub.remove();
  }, [router]);

  return null;
}
