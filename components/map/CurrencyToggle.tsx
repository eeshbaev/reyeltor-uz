import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useDisplayCurrency } from '@/lib/context/DisplayCurrencyContext';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

export function CurrencyToggle() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          ...Platform.select({
            ios: {
              shadowColor: '#000000',
              shadowOpacity: theme.isDark ? 0.35 : 0.14,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
            },
            android: { elevation: 5 },
            default: {
              boxShadow: theme.isDark
                ? '0 3px 12px rgba(0,0,0,0.35)'
                : '0 3px 12px rgba(0,0,0,0.14)',
            },
          }),
        },
      ]}
    >
      {(['UZS', 'USD'] as PriceCurrency[]).map((currency) => (
        <TogglePill
          key={currency}
          label={t(`common.${currency.toLowerCase()}`)}
          active={displayCurrency === currency}
          onPress={() => setDisplayCurrency(currency)}
          activeColor={theme.colors.accent}
        />
      ))}
    </View>
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
        <AppText variant="label" color={active ? 'onAccent' : 'primary'}>
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
    borderRadius: 999,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
  },
});
