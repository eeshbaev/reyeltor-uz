import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { MapView } from '@/components/map/MapView';
import { AppText } from '@/components/ui/AppText';
import { MAP_COVERAGE_CENTER } from '@/lib/constants';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

interface OnboardingPromiseProps {
  onStart: () => void;
  onSignIn: () => void;
}

const noop = () => undefined;

/**
 * One promise screen. The background *is* the product: the live Tashkent map with real listing
 * prices where they really are. One line of copy, one button (manual V-01, O-02).
 */
export function OnboardingPromise({ onStart, onSignIn }: OnboardingPromiseProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const { mapPoints, filters, loadListingsIfNeeded } = useListingsCache();
  const wide = width >= 600;

  // Load listings now: the map behind fills in, and the real map is ready after the goal step.
  useEffect(() => {
    void loadListingsIfNeeded();
  }, [loadListingsIfNeeded]);

  const enter = (delay: number) => (reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(320).delay(delay));

  return (
    <View style={styles.root}>
      {/* Live map, look-only: touches go to the buttons, never the map. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MapView
          listings={mapPoints}
          listingCategory={filters.category}
          onListingPress={noop}
          initialCenter={{ ...MAP_COVERAGE_CENTER.city, zoom: 12.5 }}
          showMarkers
        />
      </View>

      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="promise-scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fixedColors.ink} stopOpacity="0.25" />
            <Stop offset="0.38" stopColor={fixedColors.ink} stopOpacity="0" />
            <Stop offset="0.6" stopColor={fixedColors.ink} stopOpacity="0.75" />
            <Stop offset="0.75" stopColor={fixedColors.ink} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#promise-scrim)" />
      </Svg>

      <View
        style={[styles.copy, wide && styles.copyWide, { paddingBottom: insets.bottom + spacing.lg }]}
        pointerEvents="box-none"
      >
        <Animated.View entering={enter(80)}>
          <BrandWordmark variant="horizontal" style={styles.wordmark} />
        </Animated.View>

        <Animated.View entering={enter(160)}>
          <AppText variant="h1" style={styles.heading}>
            {t('onboarding.promise.heading')}
          </AppText>
          <AppText variant="label" style={styles.note}>
            {t('onboarding.trust.note')}
          </AppText>
        </Animated.View>

        <Animated.View entering={enter(240)} style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            onPress={() => {
              hapticLight();
              onStart();
            }}
            accessibilityRole="button"
          >
            <AppText variant="callout" style={styles.ctaLabel}>
              {t('onboarding.promise.cta')}
            </AppText>
          </Pressable>
          <Pressable onPress={onSignIn} accessibilityRole="link" hitSlop={12} style={styles.signIn}>
            <AppText variant="label" style={styles.signInText}>
              {t('onboarding.promise.signIn')}
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: fixedColors.ink },
  copy: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  copyWide: { alignSelf: 'center', width: '100%', maxWidth: 520 },
  wordmark: { alignItems: 'flex-start' },
  heading: { color: fixedColors.white, letterSpacing: -0.4 },
  note: { color: fixedColors.goldSoft, marginTop: spacing.sm },
  actions: { gap: spacing.xs },
  cta: {
    backgroundColor: fixedColors.white,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaLabel: { color: fixedColors.ink, fontWeight: '600' },
  signIn: { alignSelf: 'center', paddingVertical: spacing.smd },
  signInText: { color: 'rgba(255,255,255,0.7)' },
});
