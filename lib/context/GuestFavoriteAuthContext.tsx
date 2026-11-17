import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestFavoriteAuthSheetContent } from '@/components/favorites/GuestFavoriteAuthSheetContent';
import { resolveWelcomeDisplayName } from '@/lib/auth/displayName';
import { mapAuthFlowError } from '@/lib/auth/errors';
import { AuthRequestTimeoutError, withAuthTimeout } from '@/lib/auth/timeouts';
import { resolvePostLoginRoute, withWelcomeReturnTo } from '@/lib/auth/welcomeNavigation';
import { useAuth } from '@/lib/context/AuthContext';
import { motion } from '@/lib/design/motion';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { saveListingFavorite } from '@/lib/favorites/saveListingFavorite';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { getRegisteredFullName } from '@/lib/onboarding/storage';
import { SHEET_Z_INDEX } from '@/lib/sheetChrome';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { isValidEmail, isValidPassword } from '@/lib/validation';

interface GuestFavoriteAuthContextValue {
  pendingListingId: string | null;
  openGuestFavoriteAuth: (listingId: string) => void;
  openGuestSignIn: () => void;
  dismissGuestFavoriteAuth: () => void;
}

const GuestFavoriteAuthContext = createContext<GuestFavoriteAuthContextValue | null>(null);

/** Favorites auth sheet is only for map/listings/favorites — never Post, Profile, or Tools. */
const SHEET_DISALLOWED_TABS = new Set(['post/index', 'profile', 'tools']);

export function GuestFavoriteAuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { session, profile, loading: authLoading } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const completingRef = useRef(false);
  const preservePendingRef = useRef(false);
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');

  const snapPoints = useMemo(() => ['68%'], []);
  const animationConfigs = useBottomSheetSpringConfigs(motion.springSheet);

  const dismissGuestFavoriteAuth = useCallback(() => {
    preservePendingRef.current = false;
    sheetRef.current?.dismiss();
    setPendingListingId(null);
    setError('');
    setEmail('');
    setPassword('');
  }, []);

  const isSheetAllowedOnCurrentTab = useCallback(() => {
    if (segments[0] !== '(tabs)') return true;
    const tab = segments[1];
    return !tab || !SHEET_DISALLOWED_TABS.has(tab);
  }, [segments]);

  const openGuestFavoriteAuth = useCallback(
    (listingId: string) => {
      if (!isSheetAllowedOnCurrentTab()) return;
      setPendingListingId(listingId);
      setError('');
      sheetRef.current?.present();
    },
    [isSheetAllowedOnCurrentTab],
  );

  const openGuestSignIn = useCallback(() => {
    if (!isSheetAllowedOnCurrentTab()) return;
    setPendingListingId(null);
    setError('');
    sheetRef.current?.present();
  }, [isSheetAllowedOnCurrentTab]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.52} />
    ),
    [],
  );

  const handleSheetDismiss = useCallback(() => {
    if (preservePendingRef.current) {
      return;
    }
    setPendingListingId(null);
    setError('');
    setLoginLoading(false);
  }, []);

  const handleLogin = async () => {
    if (!isValidEmail(email) || !isValidPassword(password)) {
      setError(t('auth.loginError'));
      return;
    }
    if (!isSupabaseConfigured()) {
      setError(t('auth.backendNotConfigured'));
      return;
    }

    setLoginLoading(true);
    setError('');
    try {
      const { error: authError } = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );
      if (authError) {
        setError(t(`auth.${mapAuthFlowError(authError)}`));
      }
    } catch (caught) {
      setError(t(caught instanceof AuthRequestTimeoutError ? 'auth.networkTimeout' : 'auth.serverUnreachable'));
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !session?.user?.id || !pendingListingId || completingRef.current) return;

    completingRef.current = true;
    void (async () => {
      try {
        await saveListingFavorite(session.user.id, pendingListingId);
        sheetRef.current?.dismiss();

        const userId = session.user.id;
        const registeredFullName = await getRegisteredFullName(userId);
        const metadataName =
          typeof session.user.user_metadata?.full_name === 'string'
            ? session.user.user_metadata.full_name
            : undefined;
        const welcomeName = resolveWelcomeDisplayName({
          registeredFullName,
          metadataName,
          profileName: profile?.full_name,
        });
        const href = await resolvePostLoginRoute(welcomeName === 'there' ? undefined : welcomeName, userId);
        router.replace(withWelcomeReturnTo(href, 'favorites'));
      } catch (caught) {
        console.warn('Guest favorite auth completion failed:', caught);
      } finally {
        preservePendingRef.current = false;
        setPendingListingId(null);
        completingRef.current = false;
      }
    })();
  }, [authLoading, pendingListingId, profile?.full_name, router, session]);

  useEffect(() => {
    if (authLoading || !session || pendingListingId) return;
    sheetRef.current?.dismiss();
  }, [authLoading, pendingListingId, session]);

  useEffect(() => {
    if (segments[0] !== '(tabs)') return;
    const tab = segments[1];
    if (!tab || !SHEET_DISALLOWED_TABS.has(tab)) return;
    if (preservePendingRef.current || pendingListingId) {
      sheetRef.current?.dismiss();
      return;
    }

    sheetRef.current?.dismiss();
    setPendingListingId(null);
    setError('');
    setEmail('');
    setPassword('');
    setLoginLoading(false);
  }, [pendingListingId, segments]);

  const canSubmit = isValidEmail(email) && isValidPassword(password);

  const handleRegisterPress = () => {
    preservePendingRef.current = true;
    sheetRef.current?.dismiss();
    router.push('/(tabs)/profile/register');
  };

  return (
    <GuestFavoriteAuthContext.Provider
      value={{ pendingListingId, openGuestFavoriteAuth, openGuestSignIn, dismissGuestFavoriteAuth }}
    >
      {children}
      <BottomSheetModal
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        onDismiss={handleSheetDismiss}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong, width: 40, height: 4, borderRadius: 2 }}
        handleStyle={styles.handle}
        backgroundStyle={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: radius.xl + 4,
          borderTopRightRadius: radius.xl + 4,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
        }}
        containerStyle={{ zIndex: SHEET_Z_INDEX }}
        {...BOTTOM_SHEET_GESTURE_PROPS}
      >
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <BottomSheetScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <GuestFavoriteAuthSheetContent
              email={email}
              password={password}
              error={error}
              loginLoading={loginLoading}
              canSubmit={canSubmit}
              bottomInset={insets.bottom + spacing.lg}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onLogin={handleLogin}
              onRegisterPress={handleRegisterPress}
              onDismiss={dismissGuestFavoriteAuth}
            />
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
      </BottomSheetModal>
    </GuestFavoriteAuthContext.Provider>
  );
}

export function useGuestFavoriteAuth() {
  const ctx = useContext(GuestFavoriteAuthContext);
  if (!ctx) {
    throw new Error('useGuestFavoriteAuth must be used within GuestFavoriteAuthProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  handle: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
});
