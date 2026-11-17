import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/lib/theme';

export function FavoritesAmbientBackground() {
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
          { backgroundColor: theme.colors.error, opacity: theme.isDark ? 0.07 : 0.05 },
        ]}
      />
      <View
        style={[
          styles.orb,
          styles.orbTertiary,
          { backgroundColor: theme.colors.accent, opacity: theme.isDark ? 0.05 : 0.04 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 320,
    height: 320,
    top: -120,
    right: -100,
  },
  orbSecondary: {
    width: 240,
    height: 240,
    bottom: 180,
    left: -110,
  },
  orbTertiary: {
    width: 180,
    height: 180,
    top: '42%',
    right: -70,
  },
});
