import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { useDisplayCurrency } from '@/lib/context/DisplayCurrencyContext';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

export function CurrencyToggle() {
  const { t } = useTranslation();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const theme = useTheme();

  return (
    <FrostedView style={[styles.container, mapChromeBorder(theme)]} intensity={72}>
      {(['UZS', 'USD'] as PriceCurrency[]).map((currency) => (
        <TogglePill
          key={currency}
          label={t(`common.${currency.toLowerCase()}`)}
          active={displayCurrency === currency}
          onPress={() => setDisplayCurrency(currency)}
          activeColor={theme.colors.accent}
        />
      ))}
    </FrostedView>
  );
}

function TogglePill({
  label,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor: string;
}) {
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: active ? activeColor : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        <AppText variant="label" color={active ? 'onAccent' : 'secondary'} style={styles.pillText}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    padding: 4,
    gap: 2,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minHeight: 34,
    justifyContent: 'center',
  },
  pillText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
