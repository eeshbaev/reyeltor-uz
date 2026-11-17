import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface SaveSearchButtonProps {
  /** The current map filters are already a saved search. */
  saved: boolean;
  onPress: () => void;
}

/** Map chrome button: "Notify me about new listings for this search". */
export function SaveSearchButton({ saved, onPress }: SaveSearchButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? t('savedSearches.alreadySaved') : t('savedSearches.notifyMe')}
      accessibilityState={{ selected: saved }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      hitSlop={6}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.wrapper}>
          <FrostedView
            style={[
              styles.button,
              mapChromeBorder(theme),
              saved && { borderWidth: 1.5, borderColor: theme.colors.accent },
            ]}
            intensity={72}
          >
            <Ionicons
              name={saved ? 'notifications' : 'notifications-outline'}
              size={21}
              color={theme.colors.accent}
            />
          </FrostedView>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  button: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
});
