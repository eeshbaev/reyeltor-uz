import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { motion } from '@/lib/design/motion';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';
import type { PriceHistoryEntry } from '@/types';

const MIN_DROP = 0.03;
const RECENT_DAYS = 30;

/** The latest change if it is a real, recent drop of 3% or more to today's price. */
export function recentPriceDrop(price: number, history: PriceHistoryEntry[]): PriceHistoryEntry | null {
  const latest = history[0];
  if (!latest || latest.new_price !== price || latest.old_price <= 0) return null;
  const drop = (latest.old_price - latest.new_price) / latest.old_price;
  if (drop < MIN_DROP) return null;
  if (Date.now() - Date.parse(latest.changed_at) > RECENT_DAYS * 86_400_000) return null;
  return latest;
}

/**
 * "Was 1.2B · −8% since 3 Nov": the old price is struck through as you watch, then the
 * saving appears (design doc: Motion — price drop). Static when reduced motion is on.
 */
export function PriceDropReveal({ price, history }: { price: number; history: PriceHistoryEntry[] }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { formatPrice } = useFormatPrice();
  const reduceMotion = useReduceMotion();
  const drop = recentPriceDrop(price, history);

  const strike = useSharedValue(reduceMotion ? 1 : 0);
  const badge = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!drop || reduceMotion) return;
    strike.value = withDelay(250, withTiming(1, { duration: 400 }));
    badge.value = withDelay(600, withSpring(1, motion.springExpressive));
  }, [badge, drop, reduceMotion, strike]);

  const strikeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: strike.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badge.value, transform: [{ scale: 0.8 + badge.value * 0.2 }] }));

  if (!drop) return null;
  const percent = Math.round(((drop.old_price - drop.new_price) / drop.old_price) * 100);

  return (
    <View style={styles.row} accessibilityLabel={t('listing.priceDropA11y', { old: formatPrice(drop.old_price), percent })}>
      <View>
        <AppText variant="callout" color="secondary" tabular>
          {formatPrice(drop.old_price)}
        </AppText>
        <Animated.View style={[styles.strike, { backgroundColor: theme.colors.secondary }, strikeStyle]} />
      </View>
      <Animated.View style={[styles.badge, { backgroundColor: theme.colors.successSurface }, badgeStyle]}>
        <AppText variant="label" color="success" tabular>
          {t('listing.priceDropBadge', { percent, date: formatDate(drop.changed_at, i18n.language) })}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  strike: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1.5, transformOrigin: 'left' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
});
