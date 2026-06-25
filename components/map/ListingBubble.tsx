import { Pressable, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
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
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: theme.colors.mapBubble,
            borderColor: featured ? highlightColor : theme.colors.borderStrong,
            transform: [{ scale }],
          },
        ]}
      >
        <AppText variant="label" style={{ color: theme.colors.mapBubbleText }}>
          {formatPriceShort(price)}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
