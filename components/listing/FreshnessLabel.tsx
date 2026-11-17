import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { getFreshness } from '@/lib/freshness';
import { useTheme } from '@/lib/theme';
import type { Listing } from '@/types';

interface FreshnessLabelProps {
  listing: Pick<Listing, 'availability_confirmed_at'>;
  compact?: boolean;
}

/** "Available · confirmed today" / "Confirmed 5 days ago" / "Availability not confirmed recently". */
export function FreshnessLabel({ listing, compact = false }: FreshnessLabelProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const freshness = getFreshness(listing);
  if (!freshness) return null;

  const color =
    freshness.level === 'stale'
      ? theme.colors.warning
      : freshness.level === 'aging'
        ? theme.colors.secondary
        : theme.colors.success;
  const text =
    freshness.level === 'stale'
      ? t('freshness.stale')
      : freshness.level === 'today'
        ? t('freshness.today')
        : t('freshness.daysAgo', { count: freshness.days });

  return (
    <View style={styles.row} accessibilityRole="text">
      <Ionicons
        name={freshness.level === 'stale' ? 'alert-circle-outline' : 'checkmark-circle'}
        size={compact ? 12 : 15}
        color={color}
      />
      <AppText variant={compact ? 'micro' : 'caption'} style={{ color }} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
