import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { GUEST_FAVORITES_KEY, GUEST_FAVORITE_SNAPSHOTS_KEY } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/auth/ensureUserProfile';
import type { GuestFavoriteSnapshot, User } from '@/types';

interface AuthContextValue {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  mergeGuestFavorites: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!error && data) {
      setProfile(data as User);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (authUser?.id === userId) {
      const created = await ensureUserProfile(authUser);
      if (created) {
        const { data: retryData, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (!retryError && retryData) setProfile(retryData as User);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id);
  }, [fetchProfile, session?.user?.id]);

  const mergeGuestFavorites = useCallback(async () => {
    if (!session?.user?.id) return;
    const raw = await AsyncStorage.getItem(GUEST_FAVORITES_KEY);
    const snapshotsRaw = await AsyncStorage.getItem(GUEST_FAVORITE_SNAPSHOTS_KEY);
    if (!raw) return;

    const ids: string[] = JSON.parse(raw);
    const snapshots: GuestFavoriteSnapshot[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    for (const listingId of ids) {
      await supabase.from('favorites').upsert(
        { user_id: session.user.id, listing_id: listingId },
        { onConflict: 'user_id,listing_id', ignoreDuplicates: true },
      );
    }

    await AsyncStorage.multiRemove([GUEST_FAVORITES_KEY, GUEST_FAVORITE_SNAPSHOTS_KEY]);
    void snapshots;
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        fetchProfile(nextSession.user.id);
        mergeGuestFavorites();
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile, mergeGuestFavorites]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, refreshProfile, signOut, mergeGuestFavorites }),
    [session, profile, loading, refreshProfile, signOut, mergeGuestFavorites],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
