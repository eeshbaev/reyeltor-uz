import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationLifecycle } from '@/components/NotificationLifecycle';
import { AuthProvider } from '@/lib/context/AuthContext';
import { OverlayChromeProvider } from '@/lib/context/OverlayChromeContext';
import { DisplayCurrencyProvider } from '@/lib/context/DisplayCurrencyContext';
import { ListingsProvider } from '@/lib/context/ListingsContext';
import { MapFocusProvider } from '@/lib/context/MapFocusContext';
import { PinProvider } from '@/lib/context/PinContext';
import { initI18n } from '@/lib/i18n';
import { setupAndroidChannel } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([initI18n(), setupAndroidChannel()]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <LoadingSplash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <BottomSheetModalProvider>
      <OverlayChromeProvider>
      <AuthProvider>
        <NotificationLifecycle />
        <DisplayCurrencyProvider>
          <ListingsProvider>
          <MapFocusProvider>
          <PinProvider>
            <ThemedStatusBar />
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: '' }} />
                <Stack.Screen name="agent/[id]" options={{ headerShown: true, title: '' }} />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="registration-welcome" options={{ gestureEnabled: false, animation: 'fade' }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                <Stack.Screen name="auth/welcome" options={{ gestureEnabled: false }} />
                <Stack.Screen name="post/form" options={{ headerShown: true }} />
                <Stack.Screen name="profile/my-listings" options={{ headerShown: true }} />
                <Stack.Screen name="profile/coins" options={{ headerShown: true }} />
                <Stack.Screen name="profile/privacy" options={{ headerShown: true }} />
                <Stack.Screen name="post/pin-picker" options={{ presentation: 'fullScreenModal' }} />
              </Stack>
            </View>
          </PinProvider>
          </MapFocusProvider>
          </ListingsProvider>
        </DisplayCurrencyProvider>
      </AuthProvider>
      </OverlayChromeProvider>
      </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />;
}

function LoadingSplash() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  );
}
