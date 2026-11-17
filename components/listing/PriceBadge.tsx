import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface PriceBadgeProps {
  price: number;
  medianPrice: number | null;
}

export function PriceBadge({ price, medianPrice }: PriceBadgeProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!medianPrice || medianPrice === 0) return null;

  const diff = ((price - medianPrice) / medianPrice) * 100;
  const percent = Math.abs(Math.round(diff));

  if (percent < 3) return null;

  const isBelow = diff < 0;

  return (
    <View style={[styles.badge, isBelow ? styles.below : styles.above]}>
      <AppText variant="caption" style={[styles.text, isBelow ? styles.belowText : styles.aboveText]}>
        {isBelow ? t('listing.belowAvg', { percent }) : t('listing.aboveAvg', { percent })}
      </AppText>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2,
      borderRadius: 999,
    },
    below: { backgroundColor: theme.colors.successSurface },
    above: { backgroundColor: theme.colors.warningSurface },
    text: { fontWeight: '600' },
    belowText: { color: theme.colors.success },
    aboveText: { color: theme.colors.warning },
  });
}
