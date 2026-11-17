import { StyleSheet, View } from 'react-native';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';

interface CoinBalanceProps {
  balance: number;
  label: string;
}

export function CoinBalance({ balance, label }: CoinBalanceProps) {

  return (
    <View style={styles.container}>
      <ReyeltorCoin size="lg" />
      <AppText variant="h1" style={styles.balance}>
        {balance}
      </AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  balance: { fontWeight: '800' },
});
