import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { AppText } from '@/components/ui/AppText';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';

const BENEFITS: { key: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'benefitFind', icon: 'notifications-outline' },
  { key: 'benefitPost', icon: 'add-circle-outline' },
  { key: 'benefitAgents', icon: 'briefcase-outline' },
];

interface OnboardingPromiseProps {
  onStart: () => void;
  onSignIn: () => void;
}

/**
 * One promise screen. The background *is* the product: the live Tashkent map with real listing
 * prices where they really are. One line of copy, one button (manual V-01, O-02).
 */
export function OnboardingPromise({ onStart, onSignIn }: OnboardingPromiseProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const wide = width >= 600;

  const enter = (delay: number) => (reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(320).delay(delay));

  return (
    <View style={styles.root}>
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

        <Animated.View entering={enter(200)} style={styles.benefits}>
          {BENEFITS.map((item) => (
            <View key={item.key} style={styles.benefit}>
              <Ionicons name={item.icon} size={18} color={fixedColors.goldSoft} />
              <AppText variant="label" style={styles.benefitText}>
                {t(`onboarding.promise.${item.key}`)}
              </AppText>
            </View>
          ))}
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
  root: { flex: 1 },
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
  benefits: { gap: spacing.smd },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.smd },
  benefitText: { flex: 1, color: 'rgba(255,255,255,0.88)' },
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
