import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface DemoListingNoticeProps {
  /** 'listing' on property screens, 'agent' on demo agent profiles. */
  kind?: 'listing' | 'agent';
}

/** Explains that a listing/profile is illustrative and cannot be contacted. */
export function DemoListingNotice({ kind = 'listing' }: DemoListingNoticeProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warning }]}>
      <Ionicons name="information-circle-outline" size={20} color={theme.colors.warning} />
      <View style={styles.copy}>
        <AppText variant="label">{t(kind === 'agent' ? 'demo.agentTitle' : 'demo.listingTitle')}</AppText>
        <AppText variant="caption" color="secondary" style={styles.body}>
          {t(kind === 'agent' ? 'demo.agentBody' : 'demo.listingBody')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  copy: { flex: 1, gap: 2 },
  body: { lineHeight: 18 },
});
