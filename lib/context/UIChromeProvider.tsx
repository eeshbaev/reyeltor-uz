import { ReactNode } from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OverlayChromeProvider } from '@/lib/context/OverlayChromeContext';

interface UIChromeProviderProps {
  children: ReactNode;
}

/**
 * Combines all UI chrome providers into a single provider to reduce nesting depth.
 * Groups: GestureHandlerRootView, SafeAreaProvider, BottomSheetModalProvider, OverlayChromeProvider
 */
export function UIChromeProvider({ children }: UIChromeProviderProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <OverlayChromeProvider>
            {children}
          </OverlayChromeProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
