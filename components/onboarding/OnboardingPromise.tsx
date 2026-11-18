import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { AppText } from '@/components/ui/AppText';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { typeSize } from '@/lib/design/typography';
import { hapticLight } from '@/lib/haptics';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

interface OnboardingPromiseProps {
  onStart: () => void;
  onSignIn: () => void;
}

/** Where the price bubbles land, as fractions of the upper image area (fixed: no randomness). */
const BUBBLE_SPOTS = [
  { x: 0.16, y: 0.3 },
  { x: 0.62, y: 0.22 },
  { x: 0.4, y: 0.44 },
  { x: 0.74, y: 0.5 },
  { x: 0.22, y: 0.6 },
] as const;

/**
 * The one promise screen: what this is, why it matters, and a single Start.
 * The bubbles show real prices from the listings already loaded — never invented numbers;
 * if nothing is loaded yet, no bubbles are shown.
 */
export function OnboardingPromise({ onStart, onSignIn }: OnboardingPromiseProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { allListings, loadListingsIfNeeded } = useListingsCache();
  const { formatPriceShort } = useFormatPrice();
  const wide = width >= 600;

  // Start loading the map's listings now, so the map is ready the moment they pick a goal.
  useEffect(() => {
    void loadListingsIfNeeded();
  }, [loadListingsIfNeeded]);

  const prices = useMemo(() => {
    const seen = new Set<string>();
    const picked: number[] = [];
    for (const listing of allListings) {
      const label = formatPriceShort(listing.price);
      if (seen.has(label)) continue;
      seen.add(label);
      picked.push(listing.price);
      if (picked.length === BUBBLE_SPOTS.length) break;
    }
    return picked;
  }, [allListings, formatPriceShort]);

  const imageHeight = wide ? height : height * 0.62;
  const imageWidth = wide ? width * 0.6 : width;

  return (
    <View style={[styles.root, wide && styles.rootWide]}>
      <View style={{ width: imageWidth, height: imageHeight }}>
        <Image
          source={require('../../assets/onboarding/welcome.jpg')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        <Svg width={imageWidth} height={imageHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="promise-fade" x1="0" y1="0" x2={wide ? '1' : '0'} y2={wide ? '0' : '1'}>
              <Stop offset="0" stopColor={fixedColors.ink} stopOpacity="0.15" />
              <Stop offset="0.65" stopColor={fixedColors.ink} stopOpacity="0.35" />
              <Stop offset="1" stopColor={fixedColors.ink} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width={imageWidth} height={imageHeight} fill="url(#promise-fade)" />
        </Svg>
        {prices.map((price, index) => {
          const spot = BUBBLE_SPOTS[index];
          if (!spot) return null;
          return (
            <PriceDrop
              key={`${price}-${index}`}
              label={formatPriceShort(price)}
              left={spot.x * imageWidth}
              top={spot.y * imageHeight}
              delay={350 + index * 90}
              reduceMotion={reduceMotion}
            />
          );
        })}
        <View style={[styles.wordmark, { top: insets.top + spacing.lg }]} pointerEvents="none">
          <BrandWordmark variant="compact" animate={!reduceMotion} />
        </View>
      </View>

      <View
        style={[
          styles.copy,
          wide ? styles.copyWide : null,
          { paddingBottom: insets.bottom + spacing.lg, paddingTop: wide ? insets.top + spacing.xl : 0 },
        ]}
      >
        <Animated.View entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(320).delay(120)}>
          <AppText variant="h1" style={styles.heading}>
            {t('onboarding.promise.heading')}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>
            {t('onboarding.promise.subtitle')}
          </AppText>
          <View style={styles.note}>
            <Ionicons name="sparkles" size={14} color={fixedColors.gold} />
            <AppText variant="caption" style={styles.noteText}>
              {t('onboarding.trust.note')}
            </AppText>
          </View>
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(320).delay(240)}
          style={styles.actions}
        >
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            onPress={() => {
              hapticLight();
              onStart();
            }}
            accessibilityRole="button"
          >
            <AppText variant="label" style={styles.ctaLabel}>
              {t('onboarding.promise.cta')}
            </AppText>
          </Pressable>
          <Pressable onPress={onSignIn} accessibilityRole="link" hitSlop={8} style={styles.signIn}>
            <AppText variant="caption" style={styles.signInText}>
              {t('onboarding.promise.signIn')}
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function PriceDrop({
  label,
  left,
  top,
  delay,
  reduceMotion,
}: {
  label: string;
  left: number;
  top: number;
  delay: number;
  reduceMotion: boolean;
}) {
  const offset = useSharedValue(reduceMotion ? 0 : -18);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: reduceMotion ? 150 : 220 }));
    if (!reduceMotion) {
      offset.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 180, mass: 1 }));
    }
  }, [delay, offset, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return (
    <Animated.View style={[styles.bubble, { left, top }, style]} pointerEvents="none">
      <AppText variant="label" style={styles.bubbleText}>
        {label}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: fixedColors.ink },
  rootWide: { flexDirection: 'row' },
  wordmark: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bubble: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  bubbleText: { color: fixedColors.ink, fontWeight: '700', letterSpacing: -0.2 },
  copy: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.lg, gap: spacing.lg },
  copyWide: { justifyContent: 'center', maxWidth: 480 },
  heading: { color: fixedColors.white, fontWeight: '600', letterSpacing: -0.4, maxWidth: 420 },
  subtitle: { color: 'rgba(255,255,255,0.72)', marginTop: spacing.sm, maxWidth: 420 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 200, 114, 0.55)',
    backgroundColor: 'rgba(232, 200, 114, 0.12)',
    marginTop: spacing.md,
  },
  noteText: { color: fixedColors.goldSoft, fontWeight: '600', letterSpacing: 0.2 },
  actions: { gap: spacing.sm },
  cta: {
    backgroundColor: fixedColors.white,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaLabel: { color: fixedColors.ink, fontSize: typeSize.body, fontWeight: '600' },
  signIn: { alignSelf: 'center', paddingVertical: spacing.sm },
  signInText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
