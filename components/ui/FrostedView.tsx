import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme';

interface FrostedViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  /** When false, children are not clipped to the rounded rect (e.g. jumping emblem). */
  clip?: boolean;
}

export function FrostedView({ children, style, intensity = 80, clip = true }: FrostedViewProps) {
  const theme = useTheme();
  const flat = theme.isDark ? 'rgba(26,26,26,0.88)' : 'rgba(255,255,255,0.88)';
  const radius = typeof style?.borderRadius === 'number' ? style.borderRadius : 20;

  const webGlass =
    Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        } as ViewStyle)
      : null;

  const surfaceStyle = StyleSheet.flatten([
    styles.surface,
    { borderRadius: radius, backgroundColor: flat, overflow: clip ? 'hidden' : 'visible' },
    webGlass,
    style,
  ]);

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.shadowHost, { borderRadius: radius }]}>
        <BlurView intensity={intensity} tint={theme.isDark ? 'dark' : 'light'} style={surfaceStyle}>
          {children}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.shadowHost, { borderRadius: radius }]}>
      <View style={surfaceStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowHost: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
      default: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } as ViewStyle,
    }),
  },
  surface: {},
});
