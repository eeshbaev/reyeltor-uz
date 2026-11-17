import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { looksLikePhoneNumber, pickProfileFullName } from '@/lib/auth/displayName';
import { ensureUserProfile, repairProfileNameIfNeeded } from '@/lib/auth/ensureUserProfile';
import { realEmail } from '@/lib/auth/placeholderEmail';
import { withAuthTimeout } from '@/lib/auth/timeouts';
import { isBenignNetworkError } from '@/lib/bootstrap/networkResilience';
import { GUEST_FAVORITES_KEY, GUEST_FAVORITE_SNAPSHOTS_KEY } from '@/lib/constants';
import { partitionFavoriteIds, readLocalFavoriteIds } from '@/lib/favorites/storage';
import { logger } from '@/lib/logging/logger';
import { unregisterPushTokens } from '@/lib/notifications';
import { getRegisteredFullName, setRegisteredFullName } from '@/lib/onboarding/storage';
import { LISTINGS_STORAGE_BUCKET, supabase } from '@/lib/supabase';
import type { GuestFavoriteSnapshot, User } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  mergeGuestFavorites: () => Promise<void>;
  deleteAllUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildFallbackProfile(authUser: NonNullable<Session['user']>): User {
  const fullName =
    pickProfileFullName({
      metadataName:
        typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : undefined,
      email: realEmail(authUser.email) ?? undefined,
    }) ?? realEmail(authUser.email)?.split('@')[0] ?? 'User';
  const phone =
    typeof authUser.user_metadata?.phone === 'string' ? authUser.user_metadata.phone.trim() : '';

  return {
    id: authUser.id,
    full_name: fullName,
    phone,
    email: realEmail(authUser.email),
    telegram_username: null,
    avatar_url: null,
    bio: null,
    phone_visible: true,
    total_posted: 0,
    total_rented: 0,
    total_sold: 0,
    total_expired: 0,
    avg_days_on_market: null,
    close_rate: null,
    coin_balance: 0,
    last_active_at: new Date().toISOString(),
    created_at: authUser.created_at ?? new Date().toISOString(),
  };
}

async function syncRegisteredFullNameFromMetadata(userId: string, authUser?: NonNullable<Session['user']> | null) {
  if (!authUser) return;
  const metadataName =
    typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name.trim() : undefined;
  if (metadataName && !looksLikePhoneNumber(metadataName)) {
    await setRegisteredFullName(userId, metadataName);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string, passedAuthUser?: NonNullable<Session['user']> | null) => {
    setProfileLoading(true);
    try {
      const { data, error } = await withAuthTimeout(
        supabase.from('users').select('*').eq('id', userId).single(),
      );
      if (!error && data) {
        const authUser = passedAuthUser || (await withAuthTimeout(supabase.auth.getUser())).data.user;
        if (authUser && authUser.id === userId) {
          await syncRegisteredFullNameFromMetadata(userId, authUser);
          const registeredFullName = await getRegisteredFullName(userId);
          const repaired = await repairProfileNameIfNeeded(authUser, data as User, registeredFullName);
          setProfile(repaired ? { ...data, full_name: repaired } as User : (data as User));
        } else {
          setProfile(data as User);
        }
        return;
      }

      logger.warn('Profile fetch failed', { context: 'fetchProfile', extra: { message: error?.message } });

      const authUser = passedAuthUser || (await withAuthTimeout(supabase.auth.getUser())).data.user;
      if (authUser?.id !== userId) return;

      await ensureUserProfile(authUser);

      const { data: retryData, error: retryError } = await withAuthTimeout(
        supabase.from('users').select('*').eq('id', userId).single(),
      );
      if (!retryError && retryData) {
        await syncRegisteredFullNameFromMetadata(userId, authUser);
        const registeredFullName = await getRegisteredFullName(userId);
        const repaired = await repairProfileNameIfNeeded(authUser, retryData as User, registeredFullName);
        setProfile(repaired ? { ...retryData, full_name: repaired } as User : (retryData as User));
        return;
      }

      logger.warn('Profile retry failed', { context: 'fetchProfile', extra: { message: retryError?.message } });
      setProfile(buildFallbackProfile(authUser));
    } catch (err) {
      logger.warn('Profile fetch timed out or failed', {
        context: 'fetchProfile',
        extra: { message: err instanceof Error ? err.message : String(err) },
      });
      const authUser = passedAuthUser || (await supabase.auth.getUser()).data.user;
      if (authUser?.id === userId) {
        setProfile(buildFallbackProfile(authUser));
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [fetchProfile, session?.user?.id]);

  const mergeGuestFavorites = useCallback(async () => {
    if (!session?.user?.id) return;
    const ids = await readLocalFavoriteIds();
    const snapshotsRaw = await AsyncStorage.getItem(GUEST_FAVORITE_SNAPSHOTS_KEY);
    if (ids.length === 0) return;

    const { remoteIds, localIds } = partitionFavoriteIds(ids);
    const snapshots: GuestFavoriteSnapshot[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    for (const listingId of remoteIds) {
      await supabase.from('favorites').upsert(
        { user_id: session.user.id, listing_id: listingId },
        { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
      );
    }

    if (localIds.length > 0) {
      await AsyncStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(localIds));
    } else {
      await AsyncStorage.removeItem(GUEST_FAVORITES_KEY);
    }
    // Keep snapshots only for favorites that stay on the device (demo listings).
    const keptSnapshots = snapshots.filter((snap) => localIds.includes(snap.listing_id));
    if (keptSnapshots.length > 0) {
      await AsyncStorage.setItem(GUEST_FAVORITE_SNAPSHOTS_KEY, JSON.stringify(keptSnapshots));
    } else {
      await AsyncStorage.removeItem(GUEST_FAVORITE_SNAPSHOTS_KEY);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    // Timeout must be long enough for legit 3G connections (3-5s)
    // But short enough to not feel like app crashed (< 5s)
    // 3.5s balances responsiveness with real network latency
    const sessionTimeout = setTimeout(() => {
      if (!isMounted) return;
      logger.warn('Auth session check timed out (3.5s)', { context: 'AuthContext' });
      setLoading(false);
    }, 3_500);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        if (data.session?.user?.id) {
          // Pass authUser to avoid redundant getUser() call
          fetchProfile(data.session.user.id, data.session.user).finally(() => {
            if (isMounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!isBenignNetworkError(error)) {
          logger.error('Failed to get auth session', error, { context: 'AuthContext' });
        }
        if (isMounted) setLoading(false);
      })
      .finally(() => {
        clearTimeout(sessionTimeout);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;

      // Abort any in-flight profile fetch from previous session
      abortController.abort();

      setSession(nextSession);
      if (nextSession?.user?.id) {
        fetchProfile(nextSession.user.id);
        // Merge guest favorites asynchronously without blocking
        mergeGuestFavorites().catch((error) => {
          console.warn('Failed to merge guest favorites:', error);
          // Don't crash if merge fails - proceed anyway
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      abortController.abort();
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, mergeGuestFavorites]);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    if (userId) await unregisterPushTokens(userId);
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, [session?.user?.id]);

  const deleteAllUserData = useCallback(async () => {
    if (!session?.user?.id) return;

    const userId = session.user.id;

    try {
      // 1. Remove this user's files while their storage policies still allow it
      //    (listing photos live under "<listing id>/", the avatar under "avatars/<user id>/").
      const { data: userListings } = await supabase
        .from('listings')
        .select('id, listing_photos(storage_path)')
        .eq('user_id', userId);
      const paths = (userListings ?? [])
        .flatMap((l) => (l.listing_photos ?? []) as { storage_path: string }[])
        .map((p) => p.storage_path)
        .filter((p) => p && !p.includes(':') && !p.startsWith('http'));
      const { data: avatarFiles } = await supabase.storage.from(LISTINGS_STORAGE_BUCKET).list(`avatars/${userId}`);
      for (const f of avatarFiles ?? []) paths.push(`avatars/${userId}/${f.name}`);
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from(LISTINGS_STORAGE_BUCKET).remove(paths.slice(i, i + 100));
      }

      // 2. Delete the account itself. The server removes the sign-in and, by cascade, the
      //    profile, listings, favorites, coins, saved searches, push tokens and notifications.
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;

      await AsyncStorage.multiRemove([GUEST_FAVORITES_KEY, GUEST_FAVORITE_SNAPSHOTS_KEY]).catch(() => undefined);
      await supabase.auth.signOut().catch(() => undefined);

      setProfile(null);
      setSession(null);
    } catch (error) {
      logger.error('Error deleting user data', error, { context: 'deleteUserData' });
      throw error;
    }
  }, [session?.user?.id]);

  const value = useMemo(
    () => ({ session, profile, loading, profileLoading, refreshProfile, signOut, mergeGuestFavorites, deleteAllUserData }),
    [session, profile, loading, profileLoading, refreshProfile, signOut, mergeGuestFavorites, deleteAllUserData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
