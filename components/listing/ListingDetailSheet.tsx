import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentCard } from '@/components/listing/AgentCard';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingStatusOverlay } from '@/components/listing/ListingStatusOverlay';
import { ListingLocationPreview } from '@/components/listing/ListingLocationPreview';
import { NeighborhoodSheet, type NeighborhoodSheetRef } from '@/components/listing/NeighborhoodSheet';
import { PriceBadge } from '@/components/listing/PriceBadge';
import { PropertyInfoSection } from '@/components/listing/PropertyInfoSection';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { mapCarouselStackHeight } from '@/components/map/MapListingCarousel';
import { SHEET_BEHIND_TAB_Z_INDEX_DETAIL, sheetBottomInset } from '@/lib/sheetChrome';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { openTelegramChat } from '@/lib/contact';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { spacing } from '@/lib/design/spacing';
import { formatDate } from '@/lib/format';
import { hapticLight } from '@/lib/haptics';
import { useOpenListingOnMap } from '@/lib/hooks/useOpenListingOnMap';
import { useListingFavorite } from '@/lib/hooks/useListingFavorite';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { fetchAreaMedianPrice, fetchActiveListingCount, fetchListingById, fetchPriceHistory } from '@/lib/hooks/useListings';
import { shareListing } from '@/lib/shareListing';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos, PriceHistoryEntry } from '@/types';

export interface ListingDetailSheetRef {
  open: (listingId: string) => void;
  close: () => void;
}

interface ListingDetailSheetProps {
  onIndexChange?: (index: number) => void;
  onNeighborhoodIndexChange?: (index: number) => void;
  peekMode?: 'map' | 'list';
}

const sheetWidth = Dimensions.get('window').width - spacing.md * 2;
const screenHeight = Dimensions.get('window').height;

export const ListingDetailSheet = forwardRef<ListingDetailSheetRef, ListingDetailSheetProps>(function ListingDetailSheet(
  { onIndexChange, onNeighborhoodIndexChange, peekMode = 'map' },
  ref,
) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useFormatPrice();
  const openListingOnMap = useOpenListingOnMap();
  const { usdRate, allListings } = useListingsCache();
  const sheetRef = useRef<BottomSheet>(null);
  const scrollRef = useRef<ComponentRef<typeof BottomSheetScrollView>>(null);
  const neighborhoodRef = useRef<NeighborhoodSheetRef>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [medianPrice, setMedianPrice] = useState<number | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(-1);
  const { isFavorite, toggleFavorite } = useListingFavorite(listingId);

  const tabBarClearance = sheetBottomInset(insets.bottom);
  const peekHeight =
    peekMode === 'map'
      ? mapCarouselStackHeight(insets.bottom)
      : Math.round(screenHeight * 0.46);
  const midHeight = Math.round(screenHeight * 0.58);
  const fullHeight = Math.round(screenHeight * 0.92);
  const maxSheetIndex = 2;

  const snapPoints = useMemo(() => [peekHeight, midHeight, fullHeight], [peekHeight, midHeight, fullHeight]);
  const animationConfigs = useBottomSheetSpringConfigs({
    damping: 72,
    stiffness: 320,
    mass: 0.75,
  });

  const scrollBottomPadding = spacing.lg + tabBarClearance;
  const contentPanningEnabled = sheetIndex >= maxSheetIndex;

  useImperativeHandle(ref, () => ({
    open: (id) => {
      setListingId(id);
      setDescExpanded(false);
      setHistoryExpanded(false);
      setListing(allListings.find((item) => item.id === id) ?? null);
      sheetRef.current?.snapToIndex(0);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    },
    close: () => sheetRef.current?.close(),
  }));

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      const data = await fetchListingById(listingId);
      setListing(data);
      if (data) {
        const median = await fetchAreaMedianPrice(data.district, data.rooms, data.type);
        setMedianPrice(median);
        const history = await fetchPriceHistory(listingId);
        setPriceHistory(history as PriceHistoryEntry[]);
        if (data.users?.id) {
          const count = await fetchActiveListingCount(data.users.id);
          setActiveCount(count);
        }
      }
    })();
  }, [listingId]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) =>
      peekMode === 'map' ? null : (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.2} pressBehavior="none" />
      ),
    [peekMode],
  );

  const handleShare = useCallback(async () => {
    if (!listing) return;
    hapticLight();
    await shareListing(
      t('listing.shareMessage', {
        price: formatPrice(listing.price),
        district: listing.district,
      }),
      listing.id,
      t('listing.shareTitle'),
    );
  }, [formatPrice, listing, t]);

  const handleTelegram = useCallback(async () => {
    if (!listing?.users) return;
    hapticLight();
    await openTelegramChat(listing.users.telegram_username, t('listing.noTelegram'), t('common.telegram'));
  }, [listing?.users, t]);

  const agent = listing?.users;
  const floorText =
    listing?.floor != null
      ? `${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ''}`
      : '—';

  const visibleHistory = historyExpanded ? priceHistory : priceHistory.slice(0, 3);
  const showReadMore = (listing?.description?.length ?? 0) > 120;

  const handleShowOnMap = useCallback(() => {
    if (!listing) return;
    hapticLight();
    sheetRef.current?.close();
    openListingOnMap(listing.id, listing.lat, listing.lng);
  }, [listing, openListingOnMap]);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetIndex(index);
      onIndexChange?.(index);
      if (index === 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        });
      }
    },
    [onIndexChange],
  );

  const renderContactActions = listing ? (
    <View style={[styles.contactBar, { borderBottomColor: theme.colors.border }]}>
      {agent?.phone ? (
        <Button
          label={t('common.call')}
          onPress={() => {
            hapticLight();
            Linking.openURL(`tel:${agent.phone}`);
          }}
          style={styles.actionBtn}
        />
      ) : null}
      <Button
        label={t('common.telegram')}
        variant="secondary"
        onPress={handleTelegram}
        style={styles.actionBtn}
      />
      {listing.type === 'buy' ? (
        <Button
          label={t('tools.mortgage.calculate')}
          variant="secondary"
          onPress={() => {
            hapticLight();
            sheetRef.current?.close();
            router.push({
              pathname: '/(tabs)/tools/mortgage',
              params: { price: String(listing.price) },
            });
          }}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  ) : null;

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        {...BOTTOM_SHEET_GESTURE_PROPS}
        enableContentPanningGesture={contentPanningEnabled}
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        bottomInset={0}
        containerStyle={sheetIndex < 0 ? styles.passThrough : undefined}
        style={styles.sheet}
        backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
      >
        {!listing ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.header}>
              <View style={styles.carouselWrap}>
                <ListingCarousel photos={listing.listing_photos ?? []} width={sheetWidth} height={220} />
                <ListingStatusOverlay listing={listing} />
              </View>

              {renderContactActions}

              <View style={styles.titleRow}>
                <View style={styles.titleInfo}>
                  <AppText variant="h2">{formatPrice(listing.price)}</AppText>
                  <PriceBadge price={listing.price} medianPrice={medianPrice} />
                  <AppText variant="caption" color="secondary">
                    {listing.rooms > 0 ? `${listing.rooms} ${t('common.rooms')} · ` : ''}
                    {listing.area_m2} {t('common.area')} · {floorText} · {listing.district}
                  </AppText>
                </View>
                <View style={styles.iconActions}>
                  <Pressable
                    accessibilityLabel={t('listing.share')}
                    onPress={handleShare}
                    style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}
                  >
                    <Ionicons name="share-outline" size={22} color={theme.colors.text} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('favorites.add')}
                    onPress={() => {
                      hapticLight();
                      toggleFavorite();
                    }}
                    style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}
                  >
                    <Ionicons
                      name={isFavorite ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isFavorite ? theme.colors.error : theme.colors.text}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <BottomSheetScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
            {listing.description ? (
              <>
                <AppText variant="h3" style={styles.section}>
                  {t('listing.description')}
                </AppText>
                <AppText variant="body" numberOfLines={descExpanded ? undefined : 3}>
                  {listing.description}
                </AppText>
                {showReadMore ? (
                  <Pressable onPress={() => setDescExpanded(!descExpanded)}>
                    <AppText variant="label" color="accent">
                      {descExpanded ? t('common.showLess') : t('common.readMore')}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            <PropertyInfoSection listing={listing} locale={i18n.language} usdRate={usdRate} />

            <ListingLocationPreview
              lat={listing.lat}
              lng={listing.lng}
              title={t('listing.location')}
              subtitle={t('listing.openMap')}
              onPress={handleShowOnMap}
            />

            <Pressable
              onPress={() => {
                hapticLight();
                neighborhoodRef.current?.open(listing.lat, listing.lng, listing.id);
              }}
              style={styles.neighborhoodLink}
            >
              <AppText variant="label" color="accent">
                {t('listing.neighborhoodExplore')}
              </AppText>
            </Pressable>

            {priceHistory.length > 0 ? (
              <>
                <AppText variant="h3" style={styles.section}>
                  {t('listing.priceHistory')}
                </AppText>
                {visibleHistory.map((entry, index) => (
                  <AppText key={`${entry.id}-${index}`} variant="caption" color="secondary">
                    {formatPrice(entry.old_price)} → {formatPrice(entry.new_price)} ·{' '}
                    {formatDate(entry.changed_at, i18n.language)}
                  </AppText>
                ))}
                {priceHistory.length > 3 ? (
                  <Pressable onPress={() => setHistoryExpanded(!historyExpanded)}>
                    <AppText variant="label" color="accent">
                      {historyExpanded ? t('common.showLess') : t('common.showMore')}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {agent ? (
              <>
                <AppText variant="h3" style={styles.section}>
                  {t('listing.agent')}
                </AppText>
                <AgentCard agent={agent} activeCount={activeCount} />
                <Button
                  label={t('agent.viewProfile')}
                  variant="secondary"
                  onPress={() => {
                    sheetRef.current?.close();
                    router.push(`/agent/${agent.id}`);
                  }}
                />
              </>
            ) : null}
            </BottomSheetScrollView>
          </View>
        )}
      </BottomSheet>
      <NeighborhoodSheet ref={neighborhoodRef} onIndexChange={onNeighborhoodIndexChange} />
    </>
  );
});

const styles = StyleSheet.create({
  sheet: { zIndex: SHEET_BEHIND_TAB_Z_INDEX_DETAIL },
  passThrough: { pointerEvents: 'none' },
  body: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  scroll: { flex: 1 },
  carouselWrap: { marginBottom: spacing.sm, position: 'relative' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  content: { paddingHorizontal: spacing.md },
  titleRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs },
  titleInfo: { flex: 1, gap: spacing.xs },
  iconActions: { gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  neighborhoodLink: { marginTop: spacing.sm, paddingVertical: spacing.xs },
});
