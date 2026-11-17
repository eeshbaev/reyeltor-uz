import { useCallback } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/lib/context/AuthContext';

const LOGIN_ROUTE = '/(tabs)/profile/login' as const;

export function useRequireAuthRedirect(message?: string) {
  const router = useRouter();
  const { session, loading } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (loading || session) return;

      const href: Href = message
        ? { pathname: LOGIN_ROUTE, params: { message } }
        : LOGIN_ROUTE;
      router.replace(href);
    }, [loading, message, router, session]),
  );

  return { session, loading, isGuest: !loading && !session };
}
