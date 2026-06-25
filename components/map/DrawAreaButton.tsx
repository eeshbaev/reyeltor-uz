import { PenDrawIcon } from '@/components/icons/PenDrawIcon';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

interface DrawAreaButtonProps {
  active: boolean;
  onPress: () => void;
}

const PEN_RED_ACTIVE = '#B91C1C';

export function DrawAreaButton({ active, onPress }: DrawAreaButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Draw search area"
      accessibilityState={{ selected: active }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: active ? '#DC2626' : 'transparent',
              borderWidth: 2,
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
          <PenDrawIcon color={active ? PEN_RED_ACTIVE : theme.colors.secondary} size={22} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
