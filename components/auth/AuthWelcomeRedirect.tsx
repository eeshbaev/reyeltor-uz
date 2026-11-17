import { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { resolveWelcomeDisplayName } from '@/lib/auth/displayName';
import { resolvePostAuthRoute } from '@/lib/auth/welcomeNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import { useGuestFavoriteAuth } from '@/lib/context/GuestFavoriteAuthContext';
import { getPendingWelcomeName, getRegisteredFullName } from '@/lib/onboarding/storage';

/** Sends first-time signed-in users to the post-auth welcome screen once. */
export function AuthWelcomeRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, loading } = useAuth();
  const { pendingListingId } = useGuestFavoriteAuth();
  const pending = useRef(false);

  useEffect(() => {
    if (loading || !session || pending.current || pendingListingId) return;

    const root = segments[0];
    if (root === 'registration-welcome' || root === 'onboarding') return;

    pending.current = true;
    let isMounted = true;

    (async () => {
      try {
        if (!isMounted) return;

        const userId = session.user?.id;
        const [pendingName, registeredFullName] = await Promise.all([
          getPendingWelcomeName(),
          userId ? getRegisteredFullName(userId) : Promise.resolve(undefined),
        ]);

        if (!isMounted) return;

        const metadataName =
          typeof session.user?.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : undefined;
        const welcomeName = resolveWelcomeDisplayName({
          storedName: pendingName,
          registeredFullName,
          metadataName,
          profileName: profile?.full_name,
        });

        if (!isMounted) return;

        const href = await resolvePostAuthRoute(welcomeName === 'there' ? undefined : welcomeName, userId);

        if (!isMounted) return;

        if (typeof href === 'string' && href === '/(tabs)/map') return;
        router.replace(href);
      } catch (error) {
        console.error('Auth welcome redirect failed:', error);
        // Don't crash - user will navigate manually or see home screen
      } finally {
        if (isMounted) {
          pending.current = false;
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loading, pendingListingId, profile?.full_name, router, segments, session]);

  return null;
}
