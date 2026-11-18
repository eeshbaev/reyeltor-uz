import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { useMapChrome } from '@/lib/context/MapChromeContext';
import { useOverlayChrome } from '@/lib/context/OverlayChromeContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';

import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';
import { useTheme } from '@/lib/theme';

export { TAB_BAR_CLEARANCE };
const TAB_ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  map: { outline: 'map-outline', filled: 'map' },
  'map/index': { outline: 'map-outline', filled: 'map' },
  tools: { outline: 'calculator-outline', filled: 'calculator' },
  'post/index': { outline: 'add-circle-outline', filled: 'add-circle' },
  'favorites/index': { outline: 'heart-outline', filled: 'heart' },
  'profile': { outline: 'person-outline', filled: 'person' },
};

const MAIN_TAB_ROUTES = new Set(Object.keys(TAB_ICONS));

const TAB_LABEL_KEYS: Record<string, string> = {
  map: 'tabs.map',
  tools: 'tabs.tools',
  'post/index': 'tabs.post',
  'favorites/index': 'tabs.favorites',
  profile: 'tabs.profile',
};

/** URL of each tab's first screen (tapping the active tab returns there). */
const TAB_ROOT_PATHS: Record<string, string> = {
  map: '/map',
  'map/index': '/map',
  tools: '/tools',
  'post/index': '/post',
  'favorites/index': '/favorites',
  profile: '/profile',
};

export function FloatingTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isSuppressed } = useOverlayChrome();
  const { dismissMapOverlays } = useMapChrome();

  if (isSuppressed) return null;

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
      <FrostedView
        style={StyleSheet.flatten([
          styles.bar,
          { borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)' },
        ])}
        intensity={90}
      >
        {state.routes
          .filter((route) => MAIN_TAB_ROUTES.has(route.name))
          .map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const { options } = descriptors[route.key];
          const labelKey = TAB_LABEL_KEYS[route.name];
          const label = labelKey ? t(labelKey) : (options.title ?? route.name);
          const isFocused = state.index === routeIndex;
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          const isPost = route.name === 'post/index';

          const onPress = () => {
            hapticLight();
            dismissMapOverlays();

            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;

            if (isFocused) {
              // Tapping the active tab goes back to its first screen (e.g. Tools list).
              const rootPath = TAB_ROOT_PATHS[route.name];
              if (rootPath && pathname !== rootPath) router.navigate(rootPath as never);
              return;
            }
            navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              android_ripple={{ color: theme.colors.borderStrong, borderless: true }}
              hitSlop={8}
            >
              <View style={styles.tabInner}>
                <Ionicons
                  name={isFocused ? icons.filled : icons.outline}
                  size={isPost ? 26 : isFocused ? 23 : 21}
                  color={isFocused ? theme.colors.accent : theme.colors.secondary}
                />
                {isFocused ? <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} /> : null}
              </View>
              <AppText
                variant="micro"
                color={isFocused ? 'accent' : 'secondary'}
                numberOfLines={1}
                style={[styles.label, isFocused && styles.labelActive]}
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
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    gap: 3,
    paddingHorizontal: 2,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
    gap: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
  },
  label: { textAlign: 'center', opacity: 0.88 },
  labelActive: { fontWeight: '600', opacity: 1 },
});
