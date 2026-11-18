import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { AgentCard } from '@/components/listing/AgentCard';
import { DemoListingNotice } from '@/components/listing/DemoListingNotice';
import { FreshnessLabel } from '@/components/listing/FreshnessLabel';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingFavoriteButton } from '@/components/listing/ListingFavoriteButton';
import { ListingStatusOverlay } from '@/components/listing/ListingStatusOverlay';
import { ListingToolLinks } from '@/components/listing/ListingToolLinks';
import { PriceBadge } from '@/components/listing/PriceBadge';
import { PropertyInfoSection } from '@/components/listing/PropertyInfoSection';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ListingDetailSkeleton } from '@/components/ui/Skeleton';
import { requestCacheMedium } from '@/lib/cache/requestCache';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { isDemoId } from '@/lib/demo';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { fetchListingEngagement } from '@/lib/growth/listingEngagement';
import { quickShare } from '@/lib/growth/quickShare';
import { hapticLight } from '@/lib/haptics';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { fetchAreaMedianPrice, fetchActiveListingCount, fetchListingById, fetchPriceHistory } from '@/lib/hooks/useListings';
import { recordListingEvent } from '@/lib/listingEvents';
import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';
import { getPublicPhone } from '@/lib/profile/publicContact';
import { buildListingSharePayload } from '@/lib/shareListing';
import { SHEET_BEHIND_TAB_Z_INDEX_DETAIL } from '@/lib/sheetChrome';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos, PriceHistoryEntry } from '@/types';

const PHOTO_HEIGHT = 200;

export interface ListingDetailSheetRef {
  open: (listingId: string) => void;
  close: () => void;
}

interface ListingDetailSheetProps {
  onIndexChange?: (index: number) => void;
  onDismiss?: () => void;
  onNeighborhoodIndexChange?: (index: number) => void;
  onExploreNeighborhood?: (lat: number, lng: number, listingId: string) => void;
  peekMode?: 'map' | 'list';
  /** Pre-selected listing when the sheet is mounted open on the map. */
  initialListingId?: string | null;
  initialIndex?: number;
  /** When true, scroll content clears the floating map tab bar. */
  reserveTabBar?: boolean;
}

export const ListingDetailSheet = forwardRef<ListingDetailSheetRef, ListingDetailSheetProps>((
  { onIndexChange, onDismiss, onExploreNeighborhood, initialListingId = null, initialIndex = -1, reserveTabBar = false },
  ref,
) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { formatPrice } = useFormatPrice();
  const { usdRate, allListings } = useListingsCache();
  const sheetRef = useRef<BottomSheet>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [saveCount, setSaveCount] = useState<number | null>(null);
  const [medianPrice, setMedianPrice] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(initialIndex);

  const snapPoints = useMemo(() => (reserveTabBar ? ['80%'] : ['80%']), [reserveTabBar]);
  const scrollBottomPadding = reserveTabBar
    ? Math.max(insets.bottom, spacing.sm) + TAB_BAR_CLEARANCE + spacing.lg
    : Math.max(insets.bottom, spacing.sm) + spacing.lg;

  useEffect(() => {
    if (!initialListingId) return;
    setListingId(initialListingId);
    setListing(allListings.find((item) => item.id === initialListingId) ?? null);
  }, [allListings, initialListingId]);

  useImperativeHandle(ref, () => ({
    open: (id) => {
      setListingId(id);
      setDescExpanded(false);
      setHistoryExpanded(false);
      setListing(allListings.find((item) => item.id === id) ?? null);
      sheetRef.current?.snapToIndex(0);
    },
    close: () => {
      sheetRef.current?.close();
    },
  }));

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      // Cache listing data for 5 minutes
      const data = await requestCacheMedium.get(
        `listing_${listingId}`,
        () => fetchListingById(listingId),
      );
      setListing(data);
      if (data) {
        // The map sheet is where most listings are viewed; count it (server dedups per viewer).
        void recordListingEvent(data.id, 'view');

        // Cache median price by district, rooms, type
        const medianKey = `median_${data.district}_${data.rooms}_${data.type}`;
        const median = await requestCacheMedium.get(medianKey, () =>
          fetchAreaMedianPrice(data.district, data.rooms, data.type),
        );
        setMedianPrice(median);

        // Cache price history for 5 minutes
        const history = await requestCacheMedium.get(
          `history_${listingId}`,
          () => fetchPriceHistory(listingId),
        );
        setPriceHistory(history as PriceHistoryEntry[]);

        const engagement = await requestCacheMedium.get(
          `engagement_${listingId}`,
          () => fetchListingEngagement(listingId),
        );
        setSaveCount(engagement?.saveCount ?? null);

        // Cache active listing count for agent
        if (data.users?.id) {
          const userId = data.users.id;
          const count = await requestCacheMedium.get(
            `active_listings_${userId}`,
            () => fetchActiveListingCount(userId),
          );
          setActiveCount(count);
        }
      }
    })();
  }, [listingId]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetIndex(index);
      onIndexChange?.(index);
      if (index < 0) {
        setListingId(null);
        setListing(null);
        onDismiss?.();
      }
    },
    [onDismiss, onIndexChange],
  );

  const handleShare = useCallback(() => {
    if (!listing) return;
    const payload = buildListingSharePayload(listing, formatPrice, t, {
      priceHistory,
      saveCount,
    });
    void recordListingEvent(listing.id, 'share');
    void quickShare(payload, shareSheetRef);
  }, [formatPrice, listing, priceHistory, saveCount, t]);

  const handleSharePicker = useCallback(() => {
    if (!listing) return;
    const payload = buildListingSharePayload(listing, formatPrice, t, {
      priceHistory,
      saveCount,
    });
    void quickShare(payload, shareSheetRef, { forcePicker: true });
  }, [formatPrice, listing, priceHistory, saveCount, t]);

  const agent = listing?.users;
  const visibleHistory = historyExpanded ? priceHistory : priceHistory.slice(0, 3);
  const showReadMore = (listing?.description?.length ?? 0) > 120;

  return (
    <>
    <BottomSheet
      ref={sheetRef}
      index={initialIndex}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      onChange={handleSheetChange}
      bottomInset={reserveTabBar ? 0 : undefined}
      {...BOTTOM_SHEET_GESTURE_PROPS}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={sheetIndex >= 0}
      activeOffsetX={[-999, 999]}
      activeOffsetY={[-5, 5]}
      style={styles.sheet}
      backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
    >
      {!listing ? (
        <ListingDetailSkeleton />
      ) : (
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
        >
          <View style={[styles.photos, { width: windowWidth, height: PHOTO_HEIGHT }]}>
            <ListingCarousel
              photos={listing.listing_photos ?? []}
              width={windowWidth}
              height={PHOTO_HEIGHT}
              pagination="overlay"
              prioritizeHorizontalSwipe
            />
            <ListingFavoriteButton listingId={listing.id} variant="overlay" gestureHandler />
          </View>
          <View style={styles.body}>
              <View style={styles.actionRow}>
                {getPublicPhone(agent) ? (
                  <TouchableOpacity
                    style={[styles.actionPrimary, { backgroundColor: theme.colors.accent }]}
                    onPress={() => {
                      hapticLight();
                      const publicPhone = getPublicPhone(agent);
                      if (publicPhone) {
                        void recordListingEvent(listing.id, 'contact_call');
                        Linking.openURL(`tel:${publicPhone}`);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={18} color={theme.colors.onAccent} />
                    <AppText variant="label" color="onAccent">
                      {t('common.call')}
                    </AppText>
                  </TouchableOpacity>
                ) : null}
                {isDemoId(listing.id) ? null : (
                <TouchableOpacity
                  style={[styles.actionSecondary, { borderColor: theme.colors.border }]}
                  onPress={handleShare}
                  onLongPress={handleSharePicker}
                  delayLongPress={280}
                  activeOpacity={0.85}
                  accessibilityLabel={t('listing.share')}
                >
                  <Ionicons name="share-outline" size={18} color={theme.colors.text} />
                  <AppText variant="label">{t('listing.share')}</AppText>
                </TouchableOpacity>
                )}
                <ListingFavoriteButton listingId={listing.id} variant="action" />
              </View>

              {isDemoId(listing.id) ? <DemoListingNotice /> : null}

              <View style={styles.priceRow}>
                <ListingStatusOverlay listing={listing} inline />
                <PriceBadge price={listing.price} medianPrice={medianPrice} />
              </View>
              <FreshnessLabel listing={listing} />

              {listing.description ? (
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <AppText variant="h3">{t('listing.description')}</AppText>
                  <AppText variant="body" color="secondary" numberOfLines={descExpanded ? undefined : 4}>
                    {listing.description}
                  </AppText>
                  {showReadMore ? (
                    <Pressable onPress={() => setDescExpanded(!descExpanded)}>
                      <AppText variant="label" color="accent">
                        {descExpanded ? t('common.showLess') : t('common.readMore')}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <PropertyInfoSection listing={listing} locale={i18n.language} usdRate={usdRate} />
              <ListingToolLinks listing={listing} onNavigate={() => sheetRef.current?.close()} />

              {onExploreNeighborhood ? (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onExploreNeighborhood(listing.lat, listing.lng, listing.id);
                  }}
                  style={[styles.neighborhoodLink, { borderColor: theme.colors.border }]}
                >
                  <Ionicons name="map-outline" size={18} color={theme.colors.accent} />
                  <AppText variant="label" color="accent">
                    {t('listing.neighborhoodExplore')}
                  </AppText>
                </Pressable>
              ) : null}

              {priceHistory.length > 0 ? (
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <AppText variant="h3">{t('listing.priceHistory')}</AppText>
                  {visibleHistory.map((entry, index) => (
                    <View key={`${entry.id}-${index}`} style={styles.historyRow}>
                      <AppText variant="caption" color="secondary">
                        {formatPrice(entry.old_price)} → {formatPrice(entry.new_price)}
                      </AppText>
                      <AppText variant="micro" color="tertiary">
                        {formatDate(entry.changed_at, i18n.language)}
                      </AppText>
                    </View>
                  ))}
                  {priceHistory.length > 3 ? (
                    <Pressable onPress={() => setHistoryExpanded(!historyExpanded)}>
                      <AppText variant="label" color="accent">
                        {historyExpanded ? t('common.showLess') : t('common.showMore')}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {agent ? (
                <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <AppText variant="h3">{t('listing.agent')}</AppText>
                  <AgentCard agent={agent} activeCount={activeCount} />
                  <Button
                    label={t('agent.viewProfile')}
                    variant="secondary"
                    onPress={() => {
                      sheetRef.current?.close();
                      router.push(`/agent/${agent.id}`);
                    }}
                  />
                </View>
              ) : null}
          </View>
        </BottomSheetScrollView>
      )}
    </BottomSheet>
    <ShareSheet ref={shareSheetRef} />
    </>
  );
});

const styles = StyleSheet.create({
  sheet: { zIndex: SHEET_BEHIND_TAB_Z_INDEX_DETAIL },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  photos: {
    backgroundColor: fixedColors.night,
    overflow: 'hidden',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  actionSecondary: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyRow: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  neighborhoodLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
