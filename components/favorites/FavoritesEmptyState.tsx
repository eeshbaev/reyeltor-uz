import { type ReactNode, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoritesEmptyIllustration } from '@/components/favorites/FavoritesEmptyIllustration';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface FavoritesEmptyStateProps {
  onExploreMap: () => void;
  onSignIn?: () => void;
  /** Optional block shown above the illustration (e.g. screen header + tabs). */
  header?: ReactNode;
}

export function FavoritesEmptyState({ onExploreMap, onSignIn, header }: FavoritesEmptyStateProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbPrimary,
          { backgroundColor: theme.colors.accent, opacity: theme.isDark ? 0.08 : 0.06 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          styles.ambientOrbSecondary,
          { backgroundColor: theme.colors.danger, opacity: theme.isDark ? 0.06 : 0.05 },
        ]}
      />

      {header ? <View style={styles.headerWrap}>{header}</View> : null}
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: header ? spacing.md : insets.top + spacing.lg,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.illustrationWrap}>
          <FavoritesEmptyIllustration />
        </View>

        <AppText variant="h1" style={styles.title}>
          {onSignIn ? t('favorites.signInRequired') : t('favorites.emptyTitle')}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          {onSignIn ? t('favorites.signInHint') : t('favorites.emptyHint')}
        </AppText>

        {!onSignIn ? (
          <View style={styles.tips}>
            <TipPill icon="heart" label={t('favorites.tipHeart')} />
            <TipPill icon="swap-horizontal" label={t('favorites.tipSwipe')} />
          </View>
        ) : null}

        {onSignIn ? (
          <Button label={t('auth.login')} onPress={onSignIn} style={styles.cta} />
        ) : null}
        <Button
          label={t('favorites.exploreMap')}
          onPress={onExploreMap}
          variant={onSignIn ? 'secondary' : 'primary'}
          style={onSignIn ? { ...styles.cta, ...styles.secondaryCta } : styles.cta}
        />
      </Animated.View>
    </View>
  );
}

function TipPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tipPill,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.tipIcon, { backgroundColor: theme.colors.accentSurface }]}>
        <Ionicons name={icon} size={14} color={theme.colors.accent} />
      </View>
      <AppText variant="caption" color="secondary" style={styles.tipLabel}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  ambientOrbPrimary: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
  },
  ambientOrbSecondary: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -70,
  },
  headerWrap: {
    paddingHorizontal: spacing.md,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  illustrationWrap: {
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    maxWidth: 300,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  tips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipLabel: {
    flexShrink: 1,
  },
  cta: {
    maxWidth: 320,
  },
  secondaryCta: {
    marginTop: spacing.sm,
  },
});
