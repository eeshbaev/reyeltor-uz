import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatMemberSince } from '@/components/access/EarlyMemberBadge';
import { BrandWordmark } from '@/components/brand/BrandWordmark';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { isEarlyMember, useAccessSettings } from '@/lib/access/accessModel';
import { openSupportEmail } from '@/lib/contact/supportEmail';
import { useAuth } from '@/lib/context/AuthContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { rateFromSettings } from '@/lib/growth/ratingPrompt';
import { useTheme } from '@/lib/theme';

/** About: what the app costs today (nothing), Early Member status, what's next, feedback. */
export default function AboutScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const access = useAccessSettings();
  const version = Constants.expoConfig?.version ?? '';
  const member = isEarlyMember(profile);

  const sendFeedback = () => {
    openSupportEmail(t('access.feedbackSubject'), t('access.feedbackEmailBody', { version }));
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StackScreenHeader title={t('access.aboutTitle')} backHref="/(tabs)/profile" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
      >
        <View style={styles.brand}>
          <BrandWordmark variant="compact" />
          <AppText variant="body" style={[styles.center, styles.onDark]}>
            {t('access.tagline')}
          </AppText>
          {version ? (
            <AppText variant="caption" style={styles.onDarkMuted}>
              {t('access.version', { version })}
            </AppText>
          ) : null}
        </View>

        <Card icon="diamond-outline" title={t('access.accessTitle')}>
          <AppText variant="body" color="secondary">
            {t('access.accessBody')}
          </AppText>
          <View style={[styles.priceRow, { borderTopColor: theme.colors.border }]}>
            <AppText variant="label">{t('access.priceLabel')}</AppText>
            <AppText variant="label" style={{ color: theme.colors.success }}>
              {t('access.priceValue')}
            </AppText>
          </View>
        </Card>

        {member && profile?.early_member_since ? (
          <Card icon="sparkles" iconColor={theme.colors.coin} title={t('access.earlyTitle')}>
            <AppText variant="body" color="secondary">
              {t('access.earlyBody', { date: formatMemberSince(profile.early_member_since, i18n.language) })}
            </AppText>
          </Card>
        ) : !session && access.earlyAccessOpen ? (
          <Card icon="sparkles" iconColor={theme.colors.coin} title={t('access.earlyOpenTitle')}>
            <AppText variant="body" color="secondary">
              {t('access.earlyOpenBody')}
            </AppText>
          </Card>
        ) : null}

        <Card icon="trending-up-outline" title={t('access.futureTitle')}>
          <AppText variant="body" color="secondary">
            {t('access.futureBody')}
          </AppText>
        </Card>

        <Card icon="chatbubble-ellipses-outline" title={t('access.feedbackTitle')}>
          <AppText variant="body" color="secondary">
            {t('access.feedbackBody')}
          </AppText>
          <View style={styles.actions}>
            <Button label={t('access.feedbackCta')} variant="secondary" onPress={sendFeedback} fullWidth={false} />
            <Button label={t('access.rateCta')} variant="secondary" onPress={() => void rateFromSettings()} fullWidth={false} />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

function Card({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={iconColor ?? theme.colors.accent} />
        <AppText variant="body" style={styles.cardTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // The wordmark is drawn for dark backgrounds (same as onboarding and welcome).
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: '#0A0A0A',
  },
  onDark: { color: 'rgba(255,255,255,0.78)' },
  onDarkMuted: { color: 'rgba(255,255,255,0.45)' },
  center: { textAlign: 'center', maxWidth: 320 },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
