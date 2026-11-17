import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/lib/context/AuthContext';
import { logger } from '@/lib/logging/logger';
import {
  scheduleReengagement,
  syncCheckinRemindersForSession,
  syncPushRegistration,
  trackAppOpen,
} from '@/lib/notifications';

/** Mount inside AuthProvider to wire notification lifecycle without scattering logic across screens. */
export function NotificationLifecycle() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Helper to run async notification tasks with timeout and error handling
  const runNotificationTask = async (taskName: string, task: () => Promise<unknown>) => {
    try {
      // 3-second timeout for notification operations
      await Promise.race([
        task(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${taskName} timeout`)), 3000)
        ),
      ]);
    } catch (error) {
      logger.warn(`Notification task failed: ${taskName}`, {
        context: 'NotificationLifecycle',
        extra: { message: error instanceof Error ? error.message : String(error) },
      });
      // Don't crash app if notification setup fails - it's non-critical
    }
  };

  // Initialize notification state on mount and when userId changes
  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      await runNotificationTask('syncCheckinReminders', () =>
        syncCheckinRemindersForSession(!!userId, userId)
      );

      if (!isMounted) return;
      if (userId) {
        await runNotificationTask('syncPushRegistration', () => syncPushRegistration(userId));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Monitor app state changes for notification lifecycle
  useEffect(() => {
    let isMounted = true;

    const onChange = async (state: AppStateStatus) => {
      if (state !== 'active' || !isMounted) return;

      // Run all notification setup tasks when app becomes active
      await runNotificationTask('trackAppOpen', () => trackAppOpen());
      if (!isMounted) return;

      await runNotificationTask('scheduleReengagement', () => scheduleReengagement());
      if (!isMounted) return;

      if (userId) {
        await runNotificationTask('syncPushRegistration', () => syncPushRegistration(userId));
      }
    };

    const sub = AppState.addEventListener('change', onChange);

    // Initial setup on mount
    (async () => {
      if (!isMounted) return;
      await runNotificationTask('trackAppOpen', () => trackAppOpen());
      if (!isMounted) return;

      await runNotificationTask('scheduleReengagement', () => scheduleReengagement());
      if (!isMounted) return;

      if (userId) {
        await runNotificationTask('syncPushRegistration', () => syncPushRegistration(userId));
      }
    })();

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [userId]);

  return null;
}
