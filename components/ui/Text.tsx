import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { fontFamilyFor, useFontsLoaded } from '@/lib/design/fonts';

/**
 * Drop-in for React Native's Text that uses the app font (Inter) at the style's weight.
 * Prefer AppText (it also applies the type scale); use this where a screen styles text itself.
 */
export function Text({ style, ...props }: TextProps) {
  const fontsReady = useFontsLoaded();
  const flat = StyleSheet.flatten(style);
  const family = flat?.fontFamily ? undefined : fontFamilyFor(flat?.fontWeight, fontsReady);
  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      {...props}
      style={family ? [style, { fontFamily: family, fontWeight: 'normal' }] : style}
    />
  );
}
