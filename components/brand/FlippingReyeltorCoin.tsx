import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  COIN_SIZE_MAP,
  CoinBackFace,
  CoinFrontFace,
  type ReyeltorCoinSize,
} from '@/components/brand/ReyeltorCoin';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const FLIP_DURATION_MS = 2600;
const FLIP_TURNS = 2.25;

interface FlippingReyeltorCoinProps {
  size?: ReyeltorCoinSize;
  /** Full 360° rotations on entrance. */
  flips?: number;
}

export function FlippingReyeltorCoin({ size = 'hero', flips = FLIP_TURNS }: FlippingReyeltorCoinProps) {
  const reduceMotion = useReduceMotion();
  const px = COIN_SIZE_MAP[size];
  const rotation = useSharedValue(reduceMotion ? 0 : -18);
  const scale = useSharedValue(reduceMotion ? 1 : 0.15);
  const lift = useSharedValue(reduceMotion ? 0 : 18);

  useEffect(() => {
    if (reduceMotion) return;

    scale.value = withSpring(1, { damping: 13, stiffness: 95, mass: 0.85 });
    lift.value = withSpring(0, { damping: 14, stiffness: 110 });
    rotation.value = withDelay(
      100,
      withTiming(360 * flips, {
        duration: FLIP_DURATION_MS,
        easing: Easing.bezier(0.22, 0.85, 0.18, 1),
      }),
    );
  }, [flips, lift, reduceMotion, rotation, scale]);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { translateY: lift.value },
      { rotateY: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.22 + (1 - Math.min(scale.value, 1)) * 0.25,
    transform: [
      { scaleX: 0.7 + Math.min(scale.value, 1) * 0.3 },
      { scaleY: 0.55 + Math.min(scale.value, 1) * 0.2 },
    ],
  }));

  return (
    <View style={[styles.stage, { width: px * 1.5, height: px * 1.28 }]}>
      <View style={[styles.glow, { width: px * 1.35, height: px * 1.35, borderRadius: px * 0.68 }]} />
      <Animated.View style={[styles.shadow, { width: px * 0.82, borderRadius: px * 0.41 }, shadowStyle]} />
      <Animated.View style={[styles.coin, { width: px, height: px }, coinStyle]}>
        <View style={styles.face}>
          <CoinFrontFace size={size} />
        </View>
        <View style={[styles.face, styles.backFace]}>
          <CoinBackFace size={size} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(245, 196, 73, 0.16)',
    shadowColor: '#FBBF24',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  shadow: {
    position: 'absolute',
    bottom: 2,
    height: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  coin: {
    position: 'relative',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  backFace: {
    transform: [{ rotateY: '180deg' }],
  },
});
