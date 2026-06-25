import { FilterEmblemIcon } from '@/components/icons/FilterEmblemIcon';
import { AppText } from '@/components/ui/AppText';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

interface FilterButtonProps {
  count: number;
  onPress: () => void;
}

export function FilterButton({ count, onPress }: FilterButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Filters"
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
          <FilterEmblemIcon color={theme.colors.accent} size={20} />
          {count > 0 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.accent, borderColor: theme.colors.surfaceElevated },
              ]}
            >
              <AppText variant="micro" color="onAccent">
                {count}
              </AppText>
            </View>
          ) : null}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
