import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckinButton } from '@/components/coins/CheckinButton';
import { CoinBalance } from '@/components/coins/CoinBalance';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { CHECKIN_DAYS } from '@/lib/constants';
import { useAuth } from '@/lib/context/AuthContext';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useContentColumn } from '@/lib/design/windowClass';
import { formatDate } from '@/lib/format';
import { quickShare } from '@/lib/growth/quickShare';
import { getOrCreateReferralCode } from '@/lib/growth/referral';
import { buildReferralShareText } from '@/lib/growth/shareMessage';
import i18nInstance from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { CoinTransaction } from '@/types';

export default function CoinsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const column = useContentColumn();
  const { session, profile, refreshProfile } = useAuth();
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay();
  const canCheckIn = CHECKIN_DAYS.includes(dayOfWeek) && !checkedInToday;

  const load = useCallback(async () => {
    if (!session?.user?.id) return;

    const { data: tx } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setTransactions((tx ?? []) as CoinTransaction[]);

    const { data: checkin } = await supabase
      .from('checkin_log')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('checked_in_on', today)
      .maybeSingle();
    setCheckedInToday(!!checkin);

    if (profile?.full_name) {
      const code = await getOrCreateReferralCode(session.user.id, profile.full_name);
      setReferralCode(code);
    }

    setLoading(false);
  }, [profile?.full_name, session?.user?.id, today]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    if (!session?.user?.id || !profile || !canCheckIn) return;

    try {
      const { error: logError } = await supabase
        .from('checkin_log')
        .insert({ user_id: session.user.id, checked_in_on: today });

      // The database validates the day and awards the coin in the same transaction.
      if (logError) throw logError;

      await refreshProfile();
      await load();
    } catch (error) {
      console.error(i18nInstance.t('errors.profile.checkinFailed'), error);
      Alert.alert(t('common.error'), t('coins.checkInFailed'));
    }
  };

  const handleInviteShare = useCallback(() => {
    if (!referralCode) return;
    void quickShare(
      {
        title: t('growth.inviteTitle'),
        message: buildReferralShareText(referralCode, t),
      },
      shareSheetRef,
    );
  }, [referralCode, t]);

  if (loading || !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('profile.coins')} backHref="/(tabs)/profile" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StackScreenHeader title={t('profile.coins')} backHref="/(tabs)/profile" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[{ paddingBottom: insets.bottom + spacing.xxl }, column]}
        showsVerticalScrollIndicator
      >
        <CoinBalance balance={profile.coin_balance} label={t('coins.balance')} />
        <AppText variant="caption" color="secondary" style={styles.earnedNote}>
          {t('coins.earnedNote')}
        </AppText>
        <CheckinButton canCheckIn={canCheckIn} checkedInToday={checkedInToday} onCheckIn={handleCheckIn} />

        {referralCode ? (
          <View
            style={[
              styles.inviteCard,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <AppText variant="body" style={styles.inviteTitle}>
              {t('growth.inviteTitle')}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.inviteHint}>
              {t('growth.inviteHint')}
            </AppText>
            <AppText variant="h3" color="accent" style={styles.inviteCode}>
              {referralCode}
            </AppText>
            <Button label={t('growth.inviteShare')} onPress={handleInviteShare} fullWidth={false} />
          </View>
        ) : null}

        <AppText variant="body" style={[styles.section, { color: theme.colors.text }]}>
          {t('coins.history')}
        </AppText>
        {transactions.map((tx) => (
          <View
            key={tx.id}
            style={[styles.txRow, { borderBottomColor: theme.colors.border }]}
          >
            <AppText variant="caption" style={styles.txType}>
              {coinTypeLabel(t, tx.type)}
            </AppText>
            <AppText
              variant="caption"
              style={[
                styles.txAmount,
                tx.amount > 0 ? styles.positive : styles.negative,
              ]}
            >
              {tx.amount > 0 ? '+' : ''}
              {tx.amount}
            </AppText>
            <AppText variant="caption" color="secondary">
              {formatDate(tx.created_at, i18n.language)}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <ShareSheet ref={shareSheetRef} />
    </View>
  );
}

function coinTypeLabel(t: (key: string) => string, type: CoinTransaction['type']) {
  switch (type) {
    case 'welcome': return t('coins.typeWelcome');
    case 'checkin': return t('coins.typeCheckin');
    case 'post_cost': return t('coins.typePost');
    case 'reactivation': return t('coins.typeReactivation');
    case 'referral_register': return t('coins.typeReferralRegister');
    case 'referral_bonus': return t('coins.typeReferralBonus');
    case 'referral_first_post': return t('coins.typeReferralFirstPost');
    case 'referral_first_favorite': return t('coins.typeReferralFirstFavorite');
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  earnedNote: { textAlign: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  inviteCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  inviteTitle: { fontWeight: '700' },
  inviteHint: { lineHeight: 20 },
  inviteCode: {
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  section: { fontWeight: '700', paddingHorizontal: spacing.md, marginTop: spacing.lg },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  txType: { flex: 1 },
  txAmount: { fontWeight: '700', marginHorizontal: spacing.sm },
  positive: { color: fixedColors.greenLight },
  negative: { color: fixedColors.redLight },
});
