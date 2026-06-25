import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/lib/theme';

interface PriceBadgeProps {
  price: number;
  medianPrice: number | null;
}

export function PriceBadge({ price, medianPrice }: PriceBadgeProps) {
  const { t } = useTranslation();

  if (!medianPrice || medianPrice === 0) return null;

  const diff = ((price - medianPrice) / medianPrice) * 100;
  const percent = Math.abs(Math.round(diff));

  if (percent < 3) return null;

  const isBelow = diff < 0;

  return (
    <View style={[styles.badge, isBelow ? styles.below : styles.above]}>
      <Text style={[styles.text, isBelow ? styles.belowText : styles.aboveText]}>
        {isBelow ? t('listing.belowAvg', { percent }) : t('listing.aboveAvg', { percent })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  below: { backgroundColor: '#dcfce7' },
  above: { backgroundColor: '#fef3c7' },
  text: { fontSize: fontSize.sm, fontWeight: '600' },
  belowText: { color: colors.success },
  aboveText: { color: colors.warning },
});
