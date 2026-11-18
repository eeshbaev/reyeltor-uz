import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { typeSize } from '@/lib/design/typography';

const TELEGRAM_BLUE = fixedColors.telegram;

interface TelegramButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function TelegramButton({ label, onPress, loading, disabled }: TelegramButtonProps) {
  const inactive = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [styles.button, (pressed || inactive) && styles.dimmed]}
    >
      {loading ? (
        <ActivityIndicator color={fixedColors.white} />
      ) : (
        <>
          <Ionicons name="paper-plane" size={20} color={fixedColors.white} />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: TELEGRAM_BLUE,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dimmed: { opacity: 0.7 },
  label: { color: fixedColors.white, fontWeight: '700', fontSize: typeSize.input },
});
