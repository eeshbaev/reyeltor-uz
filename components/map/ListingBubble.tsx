import { Animated, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useTheme } from '@/lib/theme';

interface ListingBubbleProps {
  price: number;
  onPress: () => void;
  featured?: boolean;
  accentColor?: string;
}

export function ListingBubble({ price, onPress, featured, accentColor }: ListingBubbleProps) {
  const theme = useTheme();
  const highlightColor = accentColor ?? theme.colors.accent;
  const { formatPriceShort } = useFormatPrice();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <FrostedView
          style={[
            styles.bubble,
            mapChromeBorder(theme),
            featured && { borderColor: highlightColor, borderWidth: 1.5 },
          ]}
          intensity={64}
        >
          <AppText variant="label" style={[styles.label, { color: theme.colors.primary }]}>
            {formatPriceShort(price)}
          </AppText>
        </FrostedView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
