import 'react-native-gesture-handler';
import '@/lib/i18n';
import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, Platform, StyleSheet, View } from 'react-native';
import { AuthWelcomeRedirect } from '@/components/auth/AuthWelcomeRedirect';
import { ReferralClipboardBootstrap } from '@/components/growth/ReferralClipboardBootstrap';
import { NotificationHandler } from '@/components/NotificationHandler';
import { NotificationLifecycle } from '@/components/NotificationLifecycle';
import { PurposesSync } from '@/components/onboarding/PurposesSync';
import { SplashScreen as CustomSplashScreen } from '@/components/SplashScreen';
import { AppSystemBars } from '@/components/ui/AppSystemBars';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { runAppStartup } from '@/lib/bootstrap/appStartup';
import { installNetworkResilience } from '@/lib/bootstrap/networkResilience';
import { AuthProvider } from '@/lib/context/AuthContext';
import { DisplayCurrencyProvider } from '@/lib/context/DisplayCurrencyContext';
import { GuestFavoriteAuthProvider } from '@/lib/context/GuestFavoriteAuthContext';
import { ListingsProvider } from '@/lib/context/ListingsContext';
import { MapContextProvider } from '@/lib/context/MapContextProvider';
import { UIChromeProvider } from '@/lib/context/UIChromeProvider';
import { initRatingState } from '@/lib/growth/ratingPrompt';
import i18n from '@/lib/i18n';
import { queryClient } from '@/lib/queryClient';
import { initSentry } from '@/lib/sentry';

const SPLASH_BG = '#07090F';
/** Keep branded splash visible briefly so cold start never flashes a blank frame. */
const MIN_SPLASH_MS = 1_500;
// Upper bound if startup hangs on slow devices (API 28–30)
const SPLASH_FORCE_HIDE_MS = 8_000;

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

installNetworkResilience();

// Initialize Sentry for performance monitoring and error tracking
initSentry();
// Comes from @gorhom/bottom-sheet on Reanimated 4: harmless (the dependency lists are ignored).
LogBox.ignoreLogs(['[Reanimated] Dependencies should only be used on the web']);

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let splashHidden = false; // Prevent multiple hideAsync calls

    const hideSplash = async () => {
      if (splashHidden || cancelled) return;
      splashHidden = true;
      setShowSplash(false);
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn(i18n.t('errors.ui.splashScreenHideFailed'), error);
      }
    };

    // Force hide splash after 8 seconds maximum
    // By this time, either startup completed or should fail gracefully
    const forceHide = setTimeout(() => {
      if (!cancelled) {
        hideSplash();
      }
    }, SPLASH_FORCE_HIDE_MS);

    void Promise.all([
      runAppStartup().catch(() => undefined),
      initRatingState().catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
    ]).finally(() => {
      if (!cancelled) {
        hideSplash();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(forceHide);
    };
  }, []);

  return (
    <ErrorBoundary context="RootLayout">
      <QueryClientProvider client={queryClient}>
        <UIChromeProvider>
        <CustomSplashScreen isVisible={showSplash} />
        <AuthProvider>
          <GuestFavoriteAuthProvider>
          <AuthWelcomeRedirect />
          {!showSplash ? <ReferralClipboardBootstrap /> : null}
          <PurposesSync />
          <NotificationLifecycle />
          <NotificationHandler />
          <DisplayCurrencyProvider>
            <ErrorBoundary context="ListingsProvider">
              <ListingsProvider>
                <MapContextProvider>
                <AppSystemBars />
                <View style={styles.root}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      header: () => null,
                      title: '',
                      animation: 'slide_from_right',
                      ...(Platform.OS === 'android' ? { headerShadowVisible: false } : {}),
                    }}
                  >
                    <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
                    <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="agent/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="onboarding/index" options={{ gestureEnabled: false, animation: 'fade' }} />
                    <Stack.Screen name="registration-welcome/index" options={{ gestureEnabled: false, animation: 'fade' }} />
                    <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                    <Stack.Screen name="auth/reset-password" options={{ headerShown: true }} />
                    <Stack.Screen name="auth/welcome" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="post/form" options={{ headerShown: true }} />
                    <Stack.Screen name="profile/my-listings" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/coins" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/listing-performance" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/privacy" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/about" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="post/pin-picker"
                      options={{ presentation: 'fullScreenModal', title: 'Pin location', headerShown: true }}
                    />
                  </Stack>
                </View>
              </MapContextProvider>
              </ListingsProvider>
            </ErrorBoundary>
          </DisplayCurrencyProvider>
          </GuestFavoriteAuthProvider>
        </AuthProvider>
      </UIChromeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SPLASH_BG },
});
