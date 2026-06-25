import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListingCardSkeleton } from '@/components/ui/Skeleton';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { formatDate, getTrustLabelKey } from '@/lib/format';
import { fetchAgentListings } from '@/lib/hooks/useListings';
import { getDemoAgentById, isDemoId } from '@/lib/demo';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { sheetOverlayLayerStyle } from '@/lib/sheetChrome';
import { supabase } from '@/lib/supabase';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos, User } from '@/types';

export default function AgentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const [agent, setAgent] = useState<User | null>(null);
  const [listings, setListings] = useState<ListingWithPhotos[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  useSheetOverlay('agent-detail', detailOpen || neighborhoodOpen);

  useEffect(() => {
    if (!id) return;
    (async () => {
      if (isDemoId(id)) {
        setAgent(getDemoAgentById(id));
      } else {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        if (data) setAgent(data as User);
      }
      const active = await fetchAgentListings(id, 'active');
      setListings(active);
      setActiveCount(active.length);
      setLoading(false);
    })();
  }, [id]);

  if (loading || !agent) {
    return (
      <View style={{ flex: 1, padding: spacing.md, backgroundColor: theme.colors.background }}>
        <ListingCardSkeleton />
      </View>
    );
  }

  const closeRate = agent.close_rate ?? 0;
  const closeRateColor =
    closeRate >= 70 ? 'success' : closeRate >= 40 ? 'warning' : 'danger';

  const stats = [
    { label: t('agent.closeRate'), value: `${closeRate}%`, color: closeRateColor },
    { label: t('agent.totalPosted'), value: String(agent.total_posted) },
    { label: t('agent.currentlyActive'), value: String(activeCount) },
    { label: t('agent.totalRented'), value: String(agent.total_rented) },
    { label: t('agent.totalSold'), value: String(agent.total_sold) },
    { label: t('agent.totalExpired'), value: String(agent.total_expired) },
    { label: t('agent.avgDaysOnMarket'), value: agent.avg_days_on_market?.toFixed(1) ?? '—' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
      >
      <View style={styles.header}>
        <Avatar name={agent.full_name} size={88} imageUrl={agent.avatar_url} />
        <AppText variant="h2" style={{ marginTop: spacing.sm }}>
          {agent.full_name}
        </AppText>
        <Badge label={t(getTrustLabelKey(agent.total_posted))} variant="rent" />
        <AppText variant="caption" color="secondary">
          {t('common.memberSince')} {formatDate(agent.created_at, i18n.language)}
        </AppText>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
          >
            <AppText variant="h2" color={stat.color as 'success' | 'warning' | 'danger' | 'primary'}>
              {stat.value}
            </AppText>
            <AppText variant="micro" color="secondary">
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="h3" style={styles.sectionTitle}>
        {t('agent.activeListings')}
      </AppText>
      {listings.length === 0 ? (
        <EmptyState illustration="agentEmpty" title={t('agent.noListings')} />
      ) : (
        listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} onPress={() => detailRef.current?.open(listing.id)} />
        ))
      )}
      </ScrollView>
      <View style={sheetOverlayLayerStyle} pointerEvents="box-none">
        <ListingDetailSheet
          ref={detailRef}
          peekMode="list"
          onIndexChange={(index) => setDetailOpen(index >= 0)}
          onNeighborhoodIndexChange={(index) => setNeighborhoodOpen(index >= 0)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    width: '31%',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionTitle: { marginBottom: spacing.sm },
});
