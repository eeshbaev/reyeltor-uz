import { useEffect, useMemo, useState } from 'react';
import { resolveUserDisplayName } from '@/lib/auth/displayName';
import { useAuth } from '@/lib/context/AuthContext';
import { getRegisteredFullName } from '@/lib/onboarding/storage';

export function useUserDisplayName(): { displayName: string | null; loading: boolean } {
  const { session, profile } = useAuth();
  const userId = session?.user?.id;
  const [registeredFullName, setRegisteredFullName] = useState<string | undefined>();
  const [loading, setLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setRegisteredFullName(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    getRegisteredFullName(userId)
      .then((name) => {
        setRegisteredFullName(name);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to get registered full name:', error);
        setRegisteredFullName(undefined);
        setLoading(false);
      });
  }, [userId]);

  const displayName = useMemo(() => {
    if (!session) return null;

    const metadataName =
      typeof session.user.user_metadata?.full_name === 'string'
        ? session.user.user_metadata.full_name
        : undefined;

    return resolveUserDisplayName({
      registeredFullName,
      metadataName,
      profileName: profile?.full_name,
    });
  }, [session, profile?.full_name, registeredFullName]);

  return { displayName, loading };
}
