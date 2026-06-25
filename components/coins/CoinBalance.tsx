import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/lib/theme';

interface CoinBalanceProps {
  balance: number;
  label: string;
}

export function CoinBalance({ balance, label }: CoinBalanceProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.balance}>{balance}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  icon: { fontSize: 48 },
  balance: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
});
