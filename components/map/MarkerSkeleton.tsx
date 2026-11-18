import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface MarkerSkeletonProps {
  featured?: boolean;
}

/**
 * Skeleton loader for listing markers on the map
 * Shows a pulsing skeleton while listing data is loading
 */
export function MarkerSkeleton({ featured }: MarkerSkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Create a pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <FrostedView
        style={[
          styles.bubble,
          mapChromeBorder(theme),
          featured && { borderColor: theme.colors.accent, borderWidth: 1.5 },
        ]}
        intensity={64}
      >
        <View
          style={[
            styles.skeletonText,
            { backgroundColor: theme.colors.surface },
          ]}
        />
      </FrostedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  skeletonText: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
});
