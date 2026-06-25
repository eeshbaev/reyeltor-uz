import { useEffect } from 'react';
import { Image, type ImageStyle, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';
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
import { FrostedView } from '@/components/ui/FrostedView';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const EMBLEM_SOURCE = require('../../assets/reyeltor-emblem-source.png');
const INLINE_EMBLEM_SOURCE = require('../../assets/android-icon-foreground.png');

const LAND_SPRING = { damping: 9, stiffness: 320, mass: 0.55 };
const ENTRANCE_SPRING = { damping: 14, stiffness: 140, mass: 0.85 };

type JumpingEmblemVariant = 'inline' | 'badge' | 'hero';

interface JumpingEmblemProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: JumpingEmblemVariant;
  jumpHeight?: number;
  pauseMs?: number;
  entrance?: boolean;
  paused?: boolean;
}

export function JumpingEmblem({
  size = 56,
  style,
  variant = 'inline',
  jumpHeight = 16,
  pauseMs = 900,
  entrance = false,
  paused = false,
}: JumpingEmblemProps) {
  const reduceMotion = useReduceMotion();
  const jump = useSharedValue(0);
  const entranceScale = useSharedValue(entrance && !reduceMotion ? 0 : 1);

  const iconSize = size;
  const discSize = variant === 'hero' ? size + 24 : variant === 'badge' ? size + 12 : size;
  const platePadding = variant === 'hero' ? 16 : 8;
  const plateDiameter = discSize + platePadding * 2;
  const jumpRoom = variant === 'hero' || variant === 'badge' ? jumpHeight + 12 : 0;

  useEffect(() => {
    if (entrance && !reduceMotion) {
      entranceScale.value = withSpring(1, ENTRANCE_SPRING);
    }
  }, [entrance, entranceScale, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || paused) {
      jump.value = withTiming(0, { duration: 200 });
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
  }, [jump, pauseMs, paused, reduceMotion]);

  const shadowWidth = iconSize * 0.42;
  const shadowHeight = iconSize * 0.1;

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
    opacity: interpolate(jump.value, [0, 1], [variant === 'inline' ? 0.42 : 0.28, 0.1]),
    transform: [
      { scaleX: interpolate(jump.value, [0, 1], [1, 0.5]) },
      { scaleY: interpolate(jump.value, [0, 1], [1, 0.65]) },
    ],
  }));

  const emblemIcon = (
    <Image
      source={variant === 'inline' ? INLINE_EMBLEM_SOURCE : EMBLEM_SOURCE}
      style={[
        {
          width: iconSize,
          height: iconSize,
          opacity: 1,
          backgroundColor: 'transparent',
        } as ImageStyle,
        variant === 'inline' ? styles.inlineImage : null,
      ]}
      resizeMode="contain"
    />
  );

  const whiteDisc =
    variant === 'inline' ? (
      emblemIcon
    ) : (
      <View
        style={[
          styles.disc,
          {
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
          },
        ]}
      >
        {emblemIcon}
      </View>
    );

  const pinBody = <Animated.View style={[styles.pinBody, emblemStyle]}>{whiteDisc}</Animated.View>;

  const groundShadow = (
    <Animated.View
      style={[
        styles.groundShadow,
        {
          width: shadowWidth,
          height: shadowHeight,
          borderRadius: shadowHeight / 2,
        },
        shadowStyle,
      ]}
    />
  );

  if (variant === 'hero') {
    const stageHeight = plateDiameter + jumpRoom;

    return (
      <View style={[styles.heroStack, style]} pointerEvents="none">
        <View style={[styles.heroStage, { width: plateDiameter, height: stageHeight }]}>
          <View style={[styles.plateRegion, { top: jumpRoom, width: plateDiameter, height: plateDiameter }]}>
            <FrostedView
              style={{
                width: plateDiameter,
                height: plateDiameter,
                borderRadius: plateDiameter / 2,
              }}
            >
              <View style={{ width: plateDiameter, height: plateDiameter }} />
            </FrostedView>
            <View style={styles.discCenter}>
              {pinBody}
            </View>
          </View>
        </View>
        <View style={styles.heroShadowSlot}>{groundShadow}</View>
      </View>
    );
  }

  if (variant === 'badge') {
    const stageHeight = plateDiameter + jumpRoom;

    return (
      <View style={[styles.badgeStack, style]} pointerEvents="none">
        <View style={[styles.badgeStage, { width: plateDiameter, height: stageHeight }]}>
          <View style={[styles.plateRegion, { top: jumpRoom, width: plateDiameter, height: plateDiameter }]}>
            <FrostedView
              style={{
                width: plateDiameter,
                height: plateDiameter,
                borderRadius: plateDiameter / 2,
              }}
            >
              <View style={{ width: plateDiameter, height: plateDiameter }} />
            </FrostedView>
            <View style={styles.discCenter}>
              {pinBody}
            </View>
          </View>
        </View>
        <View style={styles.badgeShadowSlot}>{groundShadow}</View>
      </View>
    );
  }

  return (
    <View style={[styles.inlineStack, { width: iconSize, height: iconSize + jumpHeight }, style]} pointerEvents="none">
      <View style={[styles.inlineJumpLane, { height: iconSize + jumpHeight, paddingTop: jumpHeight }]}>
        {pinBody}
      </View>
      <View style={styles.inlineShadowSlot}>{groundShadow}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroStack: {
    alignItems: 'center',
    overflow: 'visible',
  },
  heroStage: {
    overflow: 'visible',
  },
  plateRegion: {
    position: 'absolute',
    left: 0,
    overflow: 'visible',
  },
  discCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroShadowSlot: {
    marginTop: 4,
    alignItems: 'center',
    height: 8,
    justifyContent: 'center',
  },
  badgeStack: {
    alignItems: 'center',
    overflow: 'visible',
  },
  badgeStage: {
    overflow: 'visible',
  },
  badgeShadowSlot: {
    marginTop: 2,
    alignItems: 'center',
    height: 6,
    justifyContent: 'center',
  },
  inlineStack: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  inlineJumpLane: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  inlineShadowSlot: {
    alignItems: 'center',
    marginTop: 2,
  },
  inlineImage: {
    backgroundColor: 'transparent',
  },
  groundShadow: {
    backgroundColor: 'rgba(37, 99, 235, 0.5)',
  },
  pinBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
