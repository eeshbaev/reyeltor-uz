import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { AppText } from '@/components/ui/AppText';
import { elevation } from '@/lib/design/elevation';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { useTheme } from '@/lib/theme';

interface ProfileCoinCardProps {
  balance: number;
  label: string;
}

export function ProfileCoinCard({ balance, label }: ProfileCoinCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(() => router.push('/profile/coins'));

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress}>
      <Animated.View
        style={[
          styles.card,
          elevation.subtle,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            transform: [{ scale }],
          },
        ]}
      >
        <ReyeltorCoin size="sm" />
        <View style={styles.copy}>
          <AppText variant="micro" color="secondary">
            {label}
          </AppText>
          <AppText variant="h3">{balance}</AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.tertiary} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  copy: { flex: 1, gap: 2 },
});
