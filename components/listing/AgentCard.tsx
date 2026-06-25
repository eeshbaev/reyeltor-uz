import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/lib/format';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { User } from '@/types';

interface AgentCardProps {
  agent: Pick<
    User,
    | 'id'
    | 'full_name'
    | 'avatar_url'
    | 'created_at'
    | 'close_rate'
    | 'total_posted'
    | 'total_rented'
    | 'total_sold'
    | 'total_expired'
    | 'avg_days_on_market'
  >;
  activeCount?: number;
}

export function AgentCard({ agent, activeCount = 0 }: AgentCardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/agent/${agent.id}`)}>
      <Avatar name={agent.full_name} size={56} imageUrl={agent.avatar_url} />
      <View style={styles.info}>
        <Text style={styles.name}>{agent.full_name}</Text>
        <Text style={styles.meta}>
          {t('common.memberSince')} {formatDate(agent.created_at, i18n.language)}
        </Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{t('agent.closeRate')}: {agent.close_rate ?? 0}%</Text>
          <Text style={styles.stat}>{t('agent.totalPosted')}: {agent.total_posted}</Text>
          <Text style={styles.stat}>{t('agent.currentlyActive')}: {activeCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  stats: { marginTop: spacing.sm, gap: 2 },
  stat: { fontSize: fontSize.xs, color: colors.textSecondary },
});
