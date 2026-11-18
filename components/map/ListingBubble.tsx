import { useEffect } from 'react';
import { Animated as RNAnimated, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { fixedColors } from '@/lib/design/colors';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { motion } from '@/lib/design/motion';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';

interface ListingBubbleProps {
  price: number;
  onPress: () => void;
  featured?: boolean;
  accentColor?: string;
  /** The open listing: lifts 1.15× with an accent border (design doc: Motion — bubble → card). */
  selected?: boolean;
  /** A just-published first listing: one gold ring pulse (the peak moment). */
  celebrate?: boolean;
}

export function ListingBubble({ price, onPress, featured, accentColor, selected = false, celebrate = false }: ListingBubbleProps) {
  const theme = useTheme();
  const highlightColor = accentColor ?? theme.colors.accent;
  const { formatPriceShort } = useFormatPrice();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);
  const reduceMotion = useReduceMotion();

  const lift = useSharedValue(selected && reduceMotion ? 1.15 : 1);
  const ring = useSharedValue(0);

  useEffect(() => {
    const target = selected ? 1.15 : 1;
    lift.value = reduceMotion ? target : withSpring(target, celebrate ? motion.springExpressive : motion.springSnappy);
  }, [celebrate, lift, reduceMotion, selected]);

  useEffect(() => {
    if (!celebrate || reduceMotion) return;
    ring.value = withDelay(250, withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 0 })));
  }, [celebrate, reduceMotion, ring]);

  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: lift.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.value === 0 ? 0 : 0.9 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 0.9 }],
  }));

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} hitSlop={8}>
      <Animated.View style={liftStyle}>
        {celebrate ? <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} /> : null}
        <RNAnimated.View style={{ transform: [{ scale }] }}>
          <FrostedView
            style={[
              styles.bubble,
              mapChromeBorder(theme),
              featured && { borderColor: highlightColor, borderWidth: 1.5 },
              selected && { borderColor: celebrate ? fixedColors.gold : highlightColor, borderWidth: 2 },
            ]}
            intensity={64}
          >
            <AppText variant="label" tabular style={[styles.label, { color: theme.colors.primary }]}>
              {formatPriceShort(price)}
            </AppText>
          </FrostedView>
        </RNAnimated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: fixedColors.gold,
  },
});
