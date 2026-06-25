import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { spacing } from '@/lib/design/spacing';

const SPRING = { damping: 18, stiffness: 280, mass: 0.7 };

interface OnboardingDotIndicatorProps {
  count: number;
  activeIndex: number;
  onDotPress: (index: number) => void;
}

export function OnboardingDotIndicator({ count, activeIndex, onDotPress }: OnboardingDotIndicatorProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} active={index === activeIndex} onPress={() => onDotPress(index)} />
      ))}
    </View>
  );
}

function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 24 : 8, SPRING),
    opacity: withSpring(active ? 1 : 0.45, SPRING),
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
