import { useEffect } from 'react';
import { Image, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const LOGO_SOURCE = require('../../assets/icon.png');

export type BrandWordmarkVariant = 'hero' | 'compact' | 'horizontal';

interface BrandWordmarkProps {
  variant?: BrandWordmarkVariant;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TOKENS = {
  hero: {
    logo: 56,
    plate: 104,
    main: 36,
    suffix: 36,
    gap: 20,
    ruleWidth: 56,
  },
  compact: {
    logo: 36,
    plate: 68,
    main: 24,
    suffix: 24,
    gap: 12,
    ruleWidth: 40,
  },
  horizontal: {
    logo: 28,
    plate: 52,
    main: 20,
    suffix: 20,
    gap: 12,
    ruleWidth: 0,
  },
} as const;

const GOLD = '#E8C872';

function LogoMark({ plate }: { plate: number }) {
  return (
    <View
      style={[styles.plate, { width: plate, height: plate, borderRadius: plate / 2, overflow: 'hidden' }]}
    >
      <Image
        source={LOGO_SOURCE}
        style={{ width: plate, height: plate }}
        resizeMode="cover"
        accessibilityLabel="Reyeltor-uz logo"
      />
    </View>
  );
}

function NameText({ main, suffix }: { main: number; suffix: number }) {
  return (
    <Text style={styles.nameRow} accessibilityRole="header">
      <Text style={[styles.nameMain, { fontSize: main, lineHeight: main * 1.12 }]}>Reyeltor</Text>
      <Text style={[styles.nameSuffix, { fontSize: suffix, lineHeight: suffix * 1.12 }]}>-uz</Text>
    </Text>
  );
}

export function BrandWordmark({ variant = 'hero', animate = false, style }: BrandWordmarkProps) {
  const reduceMotion = useReduceMotion();
  const t = TOKENS[variant];
  const scale = useSharedValue(animate && !reduceMotion ? 0.92 : 1);
  const opacity = useSharedValue(animate && !reduceMotion ? 0 : 1);
  const rule = useSharedValue(animate && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!animate || reduceMotion) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 140 });
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    rule.value = withDelay(180, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
  }, [animate, opacity, reduceMotion, rule, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + rule.value * 0.65,
    transform: [{ scaleX: 0.35 + rule.value * 0.65 }],
  }));

  const body =
    variant === 'horizontal' ? (
      <View style={[styles.horizontal, { gap: t.gap }]}>
        <LogoMark plate={t.plate} />
        <NameText main={t.main} suffix={t.suffix} />
      </View>
    ) : (
      <View style={[styles.stacked, { gap: t.gap }]}>
        <LogoMark plate={t.plate} />
        <NameText main={t.main} suffix={t.suffix} />
        {t.ruleWidth > 0 ? (
          <Animated.View
            style={[styles.rule, { width: t.ruleWidth }, animate && !reduceMotion ? ruleStyle : null]}
          />
        ) : null}
      </View>
    );

  if (!animate || reduceMotion) {
    return <View style={[styles.root, style]}>{body}</View>;
  }

  return <Animated.View style={[styles.root, style, animatedStyle]}>{body}</Animated.View>;
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  stacked: {
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plate: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 200, 114, 0.45)',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  nameRow: {
    textAlign: 'center',
  },
  nameMain: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  nameSuffix: {
    color: GOLD,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rule: {
    height: 2,
    marginTop: 2,
    backgroundColor: GOLD,
    borderRadius: 1,
  },
});
