import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { PRIVACY_CONTACT_EMAIL, PRIVACY_POLICY_URL } from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const openEmail = () => {
    void Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`);
  };

  const openPolicyOnline = () => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('privacy.title'), headerShown: true }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <AppText variant="body" color="secondary" style={styles.intro}>
          {t('privacy.intro')}
        </AppText>

        <Pressable onPress={openPolicyOnline} accessibilityRole="link" style={styles.onlineLink}>
          <AppText variant="body" color="accent" style={styles.onlineLinkText}>
            {t('privacy.viewOnline')}
          </AppText>
        </Pressable>

        <Section title={t('privacy.collectTitle')}>
          <AppText variant="body" color="secondary" style={styles.paragraph}>
            {t('privacy.collectIntro')}
          </AppText>
          <Bullet text={t('privacy.collectPhone')} />
          <Bullet text={t('privacy.collectEmail')} />
          <Bullet text={t('privacy.collectListings')} />
          <Bullet text={t('privacy.collectPhotos')} />
        </Section>

        <Section title={t('privacy.noSellTitle')}>
          <AppText variant="body" color="secondary" style={styles.paragraph}>
            {t('privacy.noSellBody')}
          </AppText>
        </Section>

        <Section title={t('privacy.contactTitle')}>
          <AppText variant="body" color="secondary" style={styles.paragraph}>
            {t('privacy.contactBody')}
          </AppText>
          <Pressable onPress={openEmail} accessibilityRole="link">
            <AppText variant="body" color="accent" style={styles.email}>
              {PRIVACY_CONTACT_EMAIL}
            </AppText>
          </Pressable>
        </Section>

        <AppText variant="caption" color="tertiary" style={styles.updated}>
          {t('privacy.lastUpdated')}
        </AppText>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="h3" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <AppText variant="body" color="secondary" style={styles.bulletDot}>
        •
      </AppText>
      <AppText variant="body" color="secondary" style={styles.bulletText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { marginBottom: spacing.sm },
  onlineLink: { marginBottom: spacing.lg },
  onlineLinkText: { fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm },
  paragraph: { marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs, paddingLeft: spacing.xs },
  bulletDot: { lineHeight: 22 },
  bulletText: { flex: 1 },
  email: { fontWeight: '600', marginTop: spacing.xs },
  updated: { marginTop: spacing.md },
});
