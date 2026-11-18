import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import { mapChromeBorder } from '@/lib/design/mapChrome';
import { radius } from '@/lib/design/radius';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface MapZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}

function ZoomButton({
  label,
  onPress,
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      style={styles.pressable}
    >
      <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.4 : 1 }}>
        <AppText variant="h3" color={disabled ? 'secondary' : 'primary'} style={styles.label}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

export function MapZoomControls({ onZoomIn, onZoomOut, canZoomIn = true, canZoomOut = true }: MapZoomControlsProps) {
  const theme = useTheme();

  return (
    <FrostedView style={[styles.stack, mapChromeBorder(theme)]} intensity={72}>
      <ZoomButton label="+" onPress={onZoomIn} disabled={!canZoomIn} accessibilityLabel="Zoom in" />
      <View style={[styles.divider, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)' }]} />
      <ZoomButton label="−" onPress={onZoomOut} disabled={!canZoomOut} accessibilityLabel="Zoom out" />
    </FrostedView>
  );
}

const styles = StyleSheet.create({
  stack: {
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  pressable: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    lineHeight: 24,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
