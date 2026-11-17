import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { spacing } from '@/lib/design/spacing';

const TELEGRAM_BLUE = '#229ED9';

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
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name="paper-plane" size={20} color="#fff" />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: TELEGRAM_BLUE,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dimmed: { opacity: 0.7 },
  label: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
