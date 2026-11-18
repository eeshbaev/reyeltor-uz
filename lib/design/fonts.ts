import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { useSyncExternalStore } from 'react';
import type { TextStyle } from 'react-native';

/** Inter, one file per weight (Android can't synthesise weights for custom fonts). */
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_700Bold',
  bold: 'Inter_700Bold',
};

let loaded = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders text once Inter is ready, so nothing stays in the fallback font. */
export function useFontsLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => loaded);
}

/** Loaded during the splash (app/_layout.tsx). If it fails, the system font is used. */
export async function loadAppFonts(): Promise<void> {
  try {
    await Font.loadAsync({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
    loaded = true;
    listeners.forEach((listener) => listener());
  } catch {
    loaded = false;
  }
}

/** The Inter family for a weight, or nothing (system font) when Inter isn't loaded. */
export function fontFamilyFor(weight: TextStyle['fontWeight'], ready = loaded): string | undefined {
  if (!ready) return undefined;
  return FAMILY_BY_WEIGHT[String(weight ?? '400')] ?? 'Inter_400Regular';
}
