import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { FilterEmblemIcon } from '@/components/icons/FilterEmblemIcon';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface FilterButtonProps {
  count: number;
  onPress: () => void;
}

export function FilterButton({ count, onPress }: FilterButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);
  const active = count > 0;
  const badgeLabel = count > 9 ? '9+' : String(count);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `Filters, ${count} active` : 'Filters'}
      accessibilityState={{ selected: active }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.wrapper}>
          <FrostedView
            style={[
              styles.button,
              mapChromeBorder(theme),
              active && styles.buttonActive,
              active && { borderColor: theme.colors.accent },
            ]}
            intensity={72}
          >
            <FilterEmblemIcon color={theme.colors.accent} size={20} />
          </FrostedView>
          {active ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.accent, borderColor: theme.colors.surfaceElevated },
              ]}
            >
              <AppText variant="micro" color="onAccent" style={styles.badgeText}>
                {badgeLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    zIndex: 2,
  },
  badgeText: {
    fontWeight: '700',
  },
});
