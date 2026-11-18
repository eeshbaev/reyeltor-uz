import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ReyeltorCoin } from '@/components/brand/ReyeltorCoin';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface PostInsufficientCoinsProps {
  balance: number;
}

export function PostInsufficientCoins({ balance }: PostInsufficientCoinsProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.border }]}>
        <AppText variant="h2" color="danger" style={styles.title}>
          {t('listing.notEnoughCoins')}
        </AppText>
        <AppText variant="body" color="secondary" style={styles.subtitle}>
          {t('listing.earnMore')}
        </AppText>
        <View style={styles.balanceRow}>
          <ReyeltorCoin size="md" />
          <AppText variant="h1">{balance}</AppText>
        </View>
        <Button label={t('profile.coins')} onPress={() => router.push('/profile/coins')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
});
