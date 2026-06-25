import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { hapticLight } from '@/lib/haptics';
import { useOverlayChrome } from '@/lib/context/OverlayChromeContext';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

/** Reserve space above the floating tab bar for scroll content. */
export const TAB_BAR_CLEARANCE = 100;

const TAB_ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  'map/index': { outline: 'map-outline', filled: 'map' },
  'tools': { outline: 'calculator-outline', filled: 'calculator' },
  'post/index': { outline: 'add-circle-outline', filled: 'add-circle' },
  'favorites/index': { outline: 'heart-outline', filled: 'heart' },
  'profile': { outline: 'person-outline', filled: 'person' },
};

const MAIN_TAB_ROUTES = new Set(Object.keys(TAB_ICONS));

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isSuppressed } = useOverlayChrome();

  if (isSuppressed) return null;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
      <FrostedView style={StyleSheet.flatten([styles.bar, { borderColor: theme.colors.border }])}>
        {state.routes
          .filter((route) => MAIN_TAB_ROUTES.has(route.name))
          .map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === routeIndex;
          const icons = TAB_ICONS[route.name];
          const isPost = route.name === 'post/index';

          const onPress = () => {
            hapticLight();
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;

            const nestedState = route.state;
            const isNestedDeep =
              nestedState != null &&
              typeof nestedState.index === 'number' &&
              nestedState.index > 0;

            if (isFocused) {
              if (isNestedDeep) {
                const rootScreen = nestedState.routes[0]?.name;
                if (rootScreen) {
                  navigation.navigate(route.name, { screen: rootScreen });
                }
              }
              return;
            }

            navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              android_ripple={{ color: theme.colors.borderStrong, borderless: true }}
              hitSlop={8}
            >
              <Ionicons
                name={isFocused ? icons.filled : icons.outline}
                size={isPost ? 28 : 22}
                color={isFocused ? theme.colors.accent : theme.colors.secondary}
              />
              <AppText
                variant="micro"
                color={isFocused ? 'accent' : 'secondary'}
                numberOfLines={1}
                style={styles.label}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </FrostedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    zIndex: 1000,
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 8 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: 2,
  },
  label: { textAlign: 'center' },
});
