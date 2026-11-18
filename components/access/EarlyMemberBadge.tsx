import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface EarlyMemberBadgeProps {
  since: string;
  onPress?: () => void;
}

export function formatMemberSince(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    return iso.slice(0, 7);
  }
}

/** Quiet, factual status: "Early Member · since November 2026". Opens the About screen. */
export function EarlyMemberBadge({ since, onPress }: EarlyMemberBadgeProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const label = t('access.earlyMemberSince', { date: formatMemberSince(since, i18n.language) });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.badge,
        { borderColor: theme.colors.coin, backgroundColor: theme.colors.coinSurface, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name="sparkles" size={13} color={theme.colors.coin} />
      <AppText variant="caption" style={[styles.label, { color: theme.colors.coin }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  label: { fontWeight: '600', letterSpacing: 0.2 },
});
