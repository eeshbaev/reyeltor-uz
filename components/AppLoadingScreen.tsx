import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppBootIcon } from '@/components/AppBootIcon';
import { fixedColors } from '@/lib/design/colors';
import { spacing } from '@/lib/design/spacing';

export const APP_LOADING_BG = fixedColors.splash;

interface AppLoadingScreenProps {
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

/** Full-screen boot loader: app icon + spinner on brand dark background. */
export function AppLoadingScreen({ style, iconSize = 120 }: AppLoadingScreenProps) {
  return (
    <View style={[styles.container, style]}>
      <AppBootIcon size={iconSize} />
      <ActivityIndicator size="small" color={fixedColors.blue} style={styles.spinner} accessibilityLabel="Loading" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_LOADING_BG,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  spinner: {
    marginTop: spacing.sm,
  },
});
