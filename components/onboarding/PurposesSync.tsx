import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { clearPendingPurposes, readPendingPurposes, saveUserPurposes } from '@/lib/purposes';

/**
 * Copies purposes picked during onboarding (before sign-up) to the user's profile
 * the first time they are signed in. Never overwrites purposes already on the profile.
 */
export function PurposesSync() {
  const { session, profile, refreshProfile } = useAuth();
  const syncedFor = useRef<string | null>(null);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId || !profile || syncedFor.current === userId) return;
    syncedFor.current = userId;

    void (async () => {
      const pending = await readPendingPurposes();
      if (pending.length === 0) return;
      if ((profile.purposes ?? []).length > 0) {
        await clearPendingPurposes();
        return;
      }
      if (await saveUserPurposes(userId, pending)) {
        await clearPendingPurposes();
        await refreshProfile();
      }
    })();
  }, [profile, refreshProfile, userId]);

  return null;
}
