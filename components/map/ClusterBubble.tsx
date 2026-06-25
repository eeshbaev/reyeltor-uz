import { Animated, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface ClusterBubbleProps {
  count: number;
  onPress: () => void;
  size: number;
  color?: string;
  textColor?: string;
}

export function ClusterBubble({ count, onPress, size, color, textColor }: ClusterBubbleProps) {
  const theme = useTheme();
  const bubbleColor = color ?? theme.colors.mapCluster;
  const bubbleTextColor = textColor ?? theme.colors.mapClusterText;
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);
  const label = count > 999 ? '999+' : String(count);
  const fontSize = count >= 100 ? 11 : count >= 10 ? 13 : 15;

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} hitSlop={8}>
      <Animated.View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bubbleColor,
            transform: [{ scale }],
          },
        ]}
      >
        <AppText
          variant="label"
          style={{ color: bubbleTextColor, fontWeight: '700', fontSize }}
        >
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export function getClusterSize(count: number): number {
  if (count >= 100) return 52;
  if (count >= 50) return 48;
  if (count >= 10) return 42;
  if (count >= 2) return 38;
  return 34;
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2,
    elevation: 3,
  },
});
