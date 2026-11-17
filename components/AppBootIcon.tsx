import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const APP_ICON = require('@/assets/icon.png');

interface AppBootIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/** App store icon shown during cold start and route bootstrapping. */
export function AppBootIcon({ size = 120, style }: AppBootIconProps) {
  const radius = Math.round(size * 0.2);

  return (
    <Image
      source={APP_ICON}
      style={[styles.icon, { width: size, height: size, borderRadius: radius }, style]}
      resizeMode="contain"
      accessibilityLabel="Reyeltor-uz"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
