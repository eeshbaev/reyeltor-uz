import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { ShareCardModal } from '@/components/share/ShareCardModal';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { useAuth } from '@/lib/context/AuthContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import {
  fetchListingPerformance,
  performanceInsights,
  type ListingPerformance,
  type PerformanceInsight,
} from '@/lib/listingEvents';
import { LISTING_PHOTO_PLACEHOLDER_SOURCE, resolveListingPhotoSource } from '@/lib/listingPhotos';
import { getPhotoUrl, supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

const INSIGHT_ICONS: Record<PerformanceInsight, keyof typeof Ionicons.glyphMap> = {
  attention: 'flame-outline',
  lowViews: 'trending-down-outline',
  viewsNoContacts: 'call-outline',
  phoneHidden: 'eye-off-outline',
  fewPhotos: 'images-outline',
};

export default function ListingPerformanceScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { formatPrice } = useFormatPrice();
  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [perf, setPerf] = useState<ListingPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data }, performance] = await Promise.all([
      supabase.from('listings').select('*, listing_photos(*)').eq('id', id).maybeSingle(),
      fetchListingPerformance(id),
    ]);
    setListing((data as ListingWithPhotos | null) ?? null);
    setPerf(performance);
    setFailed(!performance);
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const photo = [...(listing?.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index)[0];
  const insights = perf && listing
    ? performanceInsights(perf, {
        photoCount: listing.listing_photos?.length ?? 0,
        phoneVisible: profile?.phone_visible !== false,
      })
    : [];

  const stats: Array<{ icon: keyof typeof Ionicons.glyphMap; value: number; label: string; hint?: string }> = perf
    ? [
        { icon: 'eye-outline', value: perf.views, label: t('sellerTools.views'), hint: t('sellerTools.last7Days', { count: perf.views_7d }) },
        { icon: 'people-outline', value: perf.unique_viewers, label: t('sellerTools.uniqueViewers') },
        { icon: 'heart-outline', value: perf.favorites, label: t('sellerTools.favorites'), hint: t('sellerTools.last7Days', { count: perf.favorites_7d }) },
        { icon: 'call-outline', value: perf.contact_taps, label: t('sellerTools.contactTaps'), hint: t('sellerTools.last7Days', { count: perf.contacts_7d }) },
        { icon: 'share-social-outline', value: perf.shares, label: t('sellerTools.shares') },
        { icon: 'globe-outline', value: perf.web_views, label: t('sellerTools.webViews') },
      ]
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StackScreenHeader title={t('sellerTools.performanceTitle')} backHref="/profile/my-listings" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
        >
          {listing ? (
            <View style={[styles.summary, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <Image
                source={photo ? resolveListingPhotoSource(photo.storage_path, getPhotoUrl(photo.storage_path)) : LISTING_PHOTO_PLACEHOLDER_SOURCE}
                style={styles.thumb}
                contentFit="cover"
              />
              <View style={styles.summaryCopy}>
                <AppText variant="h3" numberOfLines={1}>{formatPrice(listing.price)}</AppText>
                <AppText variant="caption" color="secondary" numberOfLines={1}>
                  {listing.district} · {listing.area_m2} {t('common.area')}
                </AppText>
                {perf ? (
                  <AppText variant="micro" color="secondary">
                    {t('sellerTools.daysPublished', { count: perf.days_published })}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : null}

          {failed ? (
            <AppText variant="body" color="secondary" style={styles.failed}>
              {t('sellerTools.unavailable')}
            </AppText>
          ) : (
            <>
              <View style={styles.grid}>
                {stats.map((stat) => (
                  <View
                    key={stat.label}
                    style={[styles.stat, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
                  >
                    <Ionicons name={stat.icon} size={18} color={theme.colors.accent} />
                    <AppText variant="h2" style={styles.statValue}>{stat.value}</AppText>
                    <AppText variant="caption" color="secondary">{stat.label}</AppText>
                    {stat.hint ? <AppText variant="micro" color="tertiary">{stat.hint}</AppText> : null}
                  </View>
                ))}
              </View>

              {perf?.tracking_since ? (
                <AppText variant="micro" color="tertiary" style={styles.since}>
                  {t('sellerTools.trackingSince', { date: formatDate(perf.tracking_since, i18n.language) })}
                </AppText>
              ) : null}

              {insights.length > 0 ? (
                <View style={styles.insights}>
                  <AppText variant="h3">{t('sellerTools.insightsTitle')}</AppText>
                  {insights.map((insight) => (
                    <View
                      key={insight}
                      style={[styles.insight, { backgroundColor: theme.colors.accentSurface }]}
                    >
                      <Ionicons name={INSIGHT_ICONS[insight]} size={18} color={theme.colors.accent} />
                      <AppText variant="caption" style={styles.insightText}>
                        {t(`sellerTools.insight.${insight}`)}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}

          {listing && listing.status === 'active' ? (
            <Button label={t('sellerTools.shareCardTitle')} onPress={() => setSharing(true)} style={styles.shareBtn} />
          ) : null}
        </ScrollView>
      )}
      <ShareCardModal listing={sharing ? listing : null} onClose={() => setSharing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  summaryCopy: { flex: 1, justifyContent: 'center', gap: 2 },
  failed: { textAlign: 'center', marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { width: '48%', flexGrow: 1, padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  statValue: { marginTop: spacing.xs },
  since: { textAlign: 'center' },
  insights: { gap: spacing.sm },
  insight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md },
  insightText: { flex: 1, lineHeight: 18 },
  shareBtn: { marginTop: spacing.sm },
});
