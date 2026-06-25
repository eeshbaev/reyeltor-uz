import { useEffect } from 'react';
import { Image, type ImageStyle, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const EMBLEM_SOURCE = require('../../assets/reyeltor-emblem-source.png');

const LAND_SPRING = { damping: 9, stiffness: 320, mass: 0.55 };
const ENTRANCE_SPRING = { damping: 14, stiffness: 140, mass: 0.85 };

interface JumpingEmblemProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Vertical jump height in px */
  jumpHeight?: number;
  /** Pause at rest between jumps */
  pauseMs?: number;
  /** Play a one-time scale-in when mounted */
  entrance?: boolean;
}

export function JumpingEmblem({
  size = 56,
  style,
  jumpHeight = 16,
  pauseMs = 900,
  entrance = false,
}: JumpingEmblemProps) {
  const reduceMotion = useReduceMotion();
  const jump = useSharedValue(0);
  const entranceScale = useSharedValue(entrance && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (entrance && !reduceMotion) {
      entranceScale.value = withSpring(1, ENTRANCE_SPRING);
    }
  }, [entrance, entranceScale, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      jump.value = 0;
      return;
    }

    jump.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
        withSpring(0, LAND_SPRING),
        withDelay(pauseMs, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [jump, pauseMs, reduceMotion]);

  const shadowWidth = size * 0.42;
  const shadowHeight = size * 0.1;

  const emblemStyle = useAnimatedStyle(() => {
    const y = interpolate(jump.value, [0, 1], [0, -jumpHeight]);
    const squash = interpolate(jump.value, [0, 0.75, 1], [1, 0.9, 1]);
    const stretch = interpolate(jump.value, [0, 0.75, 1], [1, 1.04, 1]);

    return {
      transform: [
        { translateY: y },
        { scaleX: stretch * entranceScale.value },
        { scaleY: squash * entranceScale.value },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(jump.value, [0, 1], [0.32, 0.1]),
    transform: [
      { scaleX: interpolate(jump.value, [0, 1], [1, 0.5]) },
      { scaleY: interpolate(jump.value, [0, 1], [1, 0.65]) },
    ],
  }));

  return (
    <Animated.View style={[styles.wrapper, { width: size, height: size }, style]} pointerEvents="none">
      <Animated.View
        style={[
          styles.shadow,
          {
            width: shadowWidth,
            height: shadowHeight,
            borderRadius: shadowHeight / 2,
            bottom: size * 0.02,
          },
          shadowStyle,
        ]}
      />
      <Animated.View style={[styles.emblem, emblemStyle]}>
        <Image source={EMBLEM_SOURCE} style={[styles.image, { width: size, height: size } as ImageStyle]} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  shadow: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.45)',
  },
  emblem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
