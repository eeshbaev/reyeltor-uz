import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/lib/context/AuthContext';
import {
  scheduleReengagement,
  syncCheckinRemindersForSession,
  trackAppOpen,
} from '@/lib/notifications';

/** Mount inside AuthProvider to wire notification lifecycle without scattering logic across screens. */
export function NotificationLifecycle() {
  const { session } = useAuth();

  useEffect(() => {
    void syncCheckinRemindersForSession(!!session?.user?.id);
  }, [session?.user?.id]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      void trackAppOpen();
      void scheduleReengagement();
    };

    const sub = AppState.addEventListener('change', onChange);
    void trackAppOpen();
    void scheduleReengagement();

    return () => sub.remove();
  }, []);

  return null;
}
