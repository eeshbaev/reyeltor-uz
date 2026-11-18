import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { DemoListingNotice } from '@/components/listing/DemoListingNotice';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { ListingCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { getDemoAgentById, isDemoId } from '@/lib/demo';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { formatDate, getTrustLabelKey } from '@/lib/format';
import { quickShare } from '@/lib/growth/quickShare';
import { buildAgentShareText } from '@/lib/growth/shareMessage';
import { fetchAgentListings } from '@/lib/hooks/useListings';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { resolveAvatarSource } from '@/lib/profile/avatar';
import { getPublicPhone } from '@/lib/profile/publicContact';
import { fetchPublicProfile } from '@/lib/profile/publicProfiles';
import { sheetOverlayLayerStyle } from '@/lib/sheetChrome';
import { useTheme } from '@/lib/theme';
import { fontSize } from '@/lib/theme';
import { validateRouteId } from '@/lib/validation/uuid';
import type { ListingWithPhotos, User } from '@/types';

function AgentProfileScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [agent, setAgent] = useState<User | null>(null);
  const [listings, setListings] = useState<ListingWithPhotos[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invalidId, setInvalidId] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);

  // Validate route ID format
  useEffect(() => {
    if (!id || (!isDemoId(id) && !validateRouteId(id))) {
      setInvalidId(true);
      setLoading(false);
    }
  }, [id]);

  useSheetOverlay('agent-detail', detailOpen || neighborhoodOpen);

  const handleCallAgent = useCallback(() => {
    const publicPhone = getPublicPhone(agent);
    if (publicPhone) Linking.openURL(`tel:${publicPhone}`);
  }, [agent]);

  const handleEmailAgent = useCallback(() => {
    if (agent?.email) Linking.openURL(`mailto:${agent.email}`);
  }, [agent?.email]);

  const handleOpenListing = useCallback(
    (listingId: string) => {
      detailRef.current?.open(listingId);
    },
    [],
  );

  const handleDetailIndexChange = useCallback((index: number) => {
    setDetailOpen(index >= 0);
  }, []);

  const handleNeighborhoodIndexChange = useCallback((index: number) => {
    setNeighborhoodOpen(index >= 0);
  }, []);

  const handleShareAgent = useCallback(() => {
    if (!agent) return;
    void quickShare(
      {
        title: t('growth.shareAgentTitle'),
        message: buildAgentShareText(agent, activeCount, t),
      },
      shareSheetRef,
    );
  }, [activeCount, agent, t]);

  const handleShareAgentPicker = useCallback(() => {
    if (!agent) return;
    void quickShare(
      {
        title: t('growth.shareAgentTitle'),
        message: buildAgentShareText(agent, activeCount, t),
      },
      shareSheetRef,
      { forcePicker: true },
    );
  }, [activeCount, agent, t]);

  useEffect(() => {
    if (!id || invalidId) return;
    let cancelled = false;

    (async () => {
      try {
        if (isDemoId(id)) {
          setAgent(getDemoAgentById(id));
        } else {
          const data = await fetchPublicProfile(id);
          if (!cancelled && data) setAgent(data as User);
        }

        const active = await fetchAgentListings(id, 'active');
        if (cancelled) return;
        setListings(active);
        setActiveCount(active.length);
      } catch (err) {
        console.error('[AgentProfile] Failed to load agent:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, invalidId]);

  if (invalidId) {
    return (
      <SafeScreen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('listing.agent')} />
        <View style={styles.centered}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', marginBottom: spacing.md }}>
            {t('common.error')}
          </Text>
          <Text style={{ fontSize: fontSize.md, color: theme.colors.textSecondary, marginBottom: spacing.xl }}>
            Invalid agent ID
          </Text>
        </View>
      </SafeScreen>
    );
  }

  if (loading) {
    return (
      <SafeScreen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('listing.agent')} />
        <View style={{ flex: 1, padding: spacing.md }}>
          <ListingCardSkeleton />
        </View>
      </SafeScreen>
    );
  }

  if (!agent) {
    return (
      <SafeScreen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('listing.agent')} />
        <View style={styles.centered}>
          <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
            {t('common.error')}
          </AppText>
          <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg, textAlign: 'center' }}>
            {t('profile.profileLoadFailed')}
          </AppText>
        </View>
      </SafeScreen>
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

  const publicPhone = getPublicPhone(agent);

  return (
    <SafeScreen edges={['left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StackScreenHeader title={t('listing.agent')} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
      >
      <View style={styles.header}>
        <Avatar name={agent.full_name} size={88} source={resolveAvatarSource(agent.avatar_url)} />
        <AppText variant="h2" style={{ marginTop: spacing.sm }}>
          {agent.full_name}
        </AppText>
        <Badge label={t(getTrustLabelKey(agent.total_posted))} variant="rent" />
        <AppText variant="caption" color="secondary">
          {t('common.memberSince')} {formatDate(agent.created_at, i18n.language)}
        </AppText>
        {agent.bio ? (
          <AppText variant="body" color="secondary" style={styles.bio}>
            {agent.bio}
          </AppText>
        ) : null}
        {isDemoId(agent.id) ? (
          <DemoListingNotice kind="agent" />
        ) : (publicPhone || agent.email) ? (
          <View style={styles.contactRow}>
            {publicPhone ? (
              <Pressable
                onPress={handleCallAgent}
                style={[styles.contactChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
              >
                <AppText variant="label" color="accent">
                  {publicPhone}
                </AppText>
              </Pressable>
            ) : null}
            {agent.email ? (
              <Pressable
                onPress={handleEmailAgent}
                style={[styles.contactChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
              >
                <AppText variant="label" color="accent">
                  {agent.email}
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleShareAgent}
              onLongPress={handleShareAgentPicker}
              delayLongPress={280}
              style={[styles.contactChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
              accessibilityLabel={t('listing.share')}
            >
              <Ionicons name="share-outline" size={18} color={theme.colors.accent} />
              <AppText variant="label" color="accent">
                {t('listing.share')}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleShareAgent}
            onLongPress={handleShareAgentPicker}
            delayLongPress={280}
            style={[styles.shareOnlyBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
          >
            <Ionicons name="share-outline" size={18} color={theme.colors.accent} />
            <AppText variant="label" color="accent">
              {t('listing.share')}
            </AppText>
          </Pressable>
        )}
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
          <ListingCard key={listing.id} listing={listing} onPress={() => handleOpenListing(listing.id)} />
        ))
      )}
      </ScrollView>
      <View style={sheetOverlayLayerStyle} pointerEvents="box-none">
        <ListingDetailSheet
          ref={detailRef}
          peekMode="list"
          onIndexChange={handleDetailIndexChange}
          onNeighborhoodIndexChange={handleNeighborhoodIndexChange}
        />
      </View>
      <ShareSheet ref={shareSheetRef} />
    </SafeScreen>
  );
}

export default function AgentProfileScreen() {
  return (
    <ErrorBoundary context="AgentProfileScreen">
      <AgentProfileScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  bio: { textAlign: 'center', marginTop: spacing.md, maxWidth: 320, lineHeight: 22 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  shareOnlyBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: {
    width: '31%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionTitle: { marginBottom: spacing.sm },
});
