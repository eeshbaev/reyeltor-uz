import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/lib/theme';

/** Soft gradient orbs behind profile/favorites-style screens. */
export function ScreenAmbientBackground() {
  const theme = useTheme();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.orb,
          styles.orbPrimary,
          { backgroundColor: theme.colors.accent, opacity: theme.isDark ? 0.1 : 0.07 },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbSecondary,
          { backgroundColor: theme.colors.coin, opacity: theme.isDark ? 0.06 : 0.05 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orbPrimary: { width: 300, height: 300, top: -100, right: -90 },
  orbSecondary: { width: 220, height: 220, bottom: 120, left: -80 },
});
