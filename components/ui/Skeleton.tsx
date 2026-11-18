import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius } from '@/lib/design/radius';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { useTheme } from '@/lib/theme';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.surface,
          opacity: reduceMotion ? 0.5 : opacity,
        },
        style,
      ]}
    />
  );
}

export function ListingCardSkeleton() {
  const theme = useTheme();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
      <Skeleton width="100%" height={180} borderRadius={0} style={skeletonStyles.image} />
      <View style={skeletonStyles.content}>
        <Skeleton width="55%" height={22} />
        <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
        <View style={skeletonStyles.pills}>
          <Skeleton width={48} height={24} borderRadius={12} />
          <Skeleton width={56} height={24} borderRadius={12} />
          <Skeleton width={40} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function FavoriteListingCardSkeleton() {
  const theme = useTheme();
  return (
    <View style={[skeletonStyles.favoriteCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
      <Skeleton width="100%" height={220} borderRadius={0} />
      <View style={skeletonStyles.favoriteBody}>
        <View style={skeletonStyles.favoritePills}>
          <Skeleton width={64} height={26} borderRadius={13} />
          <Skeleton width={72} height={26} borderRadius={13} />
        </View>
        <View style={skeletonStyles.favoriteFooter}>
          <Skeleton width="34%" height={14} borderRadius={7} />
          <Skeleton width={96} height={26} borderRadius={13} />
        </View>
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  image: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  content: { padding: 16 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 12 },
  favoriteCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  favoriteBody: { padding: 16, gap: 12 },
  favoritePills: { flexDirection: 'row', gap: 8 },
  favoriteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
