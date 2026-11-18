import { Animated, Pressable, StyleSheet } from 'react-native';
import { PenDrawIcon } from '@/components/icons/PenDrawIcon';
import { FrostedView } from '@/components/ui/FrostedView';
import { fixedColors } from '@/lib/design/colors';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface DrawAreaButtonProps {
  active: boolean;
  onPress: () => void;
}

const PEN_RED_ACTIVE = fixedColors.red;

export function DrawAreaButton({ active, onPress }: DrawAreaButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Draw search area"
      accessibilityState={{ selected: active }}
      style={styles.pressable}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <FrostedView
          style={[
            styles.button,
            mapChromeBorder(theme),
            active && { borderColor: 'rgba(220, 38, 38, 0.45)', borderWidth: 1.5 },
          ]}
          intensity={72}
        >
          <PenDrawIcon color={active ? PEN_RED_ACTIVE : theme.colors.secondary} size={21} />
        </FrostedView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
