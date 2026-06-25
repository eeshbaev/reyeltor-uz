import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckinButton } from '@/components/coins/CheckinButton';
import { CoinBalance } from '@/components/coins/CoinBalance';
import { CoinTierTable } from '@/components/coins/CostDisplay';
import { CHECKIN_DAYS } from '@/lib/constants';
import { useAuth } from '@/lib/context/AuthContext';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { CoinTransaction } from '@/types';

export default function CoinsScreen() {
  const { t, i18n } = useTranslation();
  const { session, profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);

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

    setLoading(false);
  }, [session?.user?.id, today, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckIn = async () => {
    if (!session?.user?.id || !profile || !canCheckIn) return;

    await supabase.from('checkin_log').insert({ user_id: session.user.id, checked_in_on: today });
    await supabase.from('users').update({ coin_balance: profile.coin_balance + 1 }).eq('id', session.user.id);
    await supabase.from('coin_transactions').insert({
      user_id: session.user.id,
      amount: 1,
      type: 'checkin',
    });

    await refreshProfile();
    await load();
  };

  if (loading || !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <CoinBalance balance={profile.coin_balance} label={t('coins.balance')} />
      <CheckinButton canCheckIn={canCheckIn} checkedInToday={checkedInToday} onCheckIn={handleCheckIn} />

      <Text style={styles.section}>{t('coins.history')}</Text>
      {transactions.map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <Text style={styles.txType}>{coinTypeLabel(t, tx.type)}</Text>
          <Text style={[styles.txAmount, tx.amount > 0 ? styles.positive : styles.negative]}>
            {tx.amount > 0 ? '+' : ''}{tx.amount}
          </Text>
          <Text style={styles.txDate}>{formatDate(tx.created_at, i18n.language)}</Text>
        </View>
      ))}

      <CoinTierTable />
    </ScrollView>
  );
}

function coinTypeLabel(t: (key: string) => string, type: CoinTransaction['type']) {
  switch (type) {
    case 'welcome': return t('coins.typeWelcome');
    case 'checkin': return t('coins.typeCheckin');
    case 'post_cost': return t('coins.typePost');
    case 'reactivation': return t('coins.typeReactivation');
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: fontSize.md, fontWeight: '700', paddingHorizontal: spacing.md, marginTop: spacing.lg, color: colors.text },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txType: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  txAmount: { fontWeight: '700', marginHorizontal: spacing.sm },
  positive: { color: colors.success },
  negative: { color: colors.error },
  txDate: { fontSize: fontSize.xs, color: colors.textSecondary },
});
