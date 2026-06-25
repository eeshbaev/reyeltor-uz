import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { COIN_TIERS } from '@/lib/coins';
import { colors, fontSize, spacing } from '@/lib/theme';

interface CostDisplayProps {
  cost: number;
}

export function CostDisplay({ cost }: CostDisplayProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.cost}>
        {cost === 0 ? t('listing.freePost') : t('listing.postCost', { cost })}
      </Text>
    </View>
  );
}

export function CoinTierTable() {
  const { t } = useTranslation();

  return (
    <View style={styles.table}>
      <Text style={styles.title}>{t('coins.tierTable')}</Text>
      {COIN_TIERS.map((tier) => (
        <View key={tier.labelKey} style={styles.row}>
          <Text style={styles.range}>{t(tier.labelKey)}</Text>
          <Text style={styles.costCell}>{tier.cost === 0 ? t('coins.free') : tier.cost}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    margin: spacing.md,
  },
  cost: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  table: { padding: spacing.md },
  title: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  range: { fontSize: fontSize.sm, color: colors.text },
  costCell: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
});
