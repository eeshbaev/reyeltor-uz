import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { AgentCard } from '@/components/listing/AgentCard';
import { DemoListingNotice } from '@/components/listing/DemoListingNotice';
import { FreshnessLabel } from '@/components/listing/FreshnessLabel';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingLocationPreview } from '@/components/listing/ListingLocationPreview';
import { ListingToolLinks } from '@/components/listing/ListingToolLinks';
import { NeighborhoodSheet, type NeighborhoodSheetRef } from '@/components/listing/NeighborhoodSheet';
import { PriceBadge } from '@/components/listing/PriceBadge';
import { PropertyInfoSection } from '@/components/listing/PropertyInfoSection';
import { BackButton } from '@/components/navigation/BackButton';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FrostedView } from '@/components/ui/FrostedView';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { isDemoId } from '@/lib/demo';
import { radius } from '@/lib/design/radius';
import { getDeviceId } from '@/lib/device';
import { formatDate } from '@/lib/format';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { fetchListingEngagement } from '@/lib/growth/listingEngagement';
import { quickShare } from '@/lib/growth/quickShare';
import { hapticLight } from '@/lib/haptics';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { useListingFavorite } from '@/lib/hooks/useListingFavorite';
import { fetchAreaMedianPrice, fetchActiveListingCount, fetchListingById, fetchPriceHistory } from '@/lib/hooks/useListings';
import { useOpenListingOnMap } from '@/lib/hooks/useOpenListingOnMap';
import { recordListingEvent } from '@/lib/listingEvents';
import { logger } from '@/lib/logging/logger';
import { getPublicPhone } from '@/lib/profile/publicContact';
import { buildListingSharePayload } from '@/lib/shareListing';
import { SHEET_Z_INDEX } from '@/lib/sheetChrome';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/lib/theme';
import { validateRouteId } from '@/lib/validation/uuid';
import type { FlagReason, ListingWithPhotos, PriceHistoryEntry } from '@/types';

function ListingDetailScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { usdRate } = useListingsCache();
  const { formatPrice } = useFormatPrice();
  const openListingOnMap = useOpenListingOnMap();
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const neighborhoodRef = useRef<NeighborhoodSheetRef>(null);
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [saveCount, setSaveCount] = useState<number | null>(null);
  const [medianPrice, setMedianPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalidId, setInvalidId] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  // Validate route ID format
  useEffect(() => {
    if (!id || !validateRouteId(id)) {
      setInvalidId(true);
      setLoading(false);
    }
  }, [id]);

  const { isFavorite, toggleFavorite } = useListingFavorite(id ?? null);

  const snapPoints = useMemo(() => ['40%'], []);
  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const handleSharePress = useCallback(() => {
    if (!listing) return;
    const payload = buildListingSharePayload(listing, formatPrice, t, {
      priceHistory,
      saveCount,
    });
    void recordListingEvent(listing.id, 'share');
    void quickShare(payload, shareSheetRef);
  }, [listing, formatPrice, t, priceHistory, saveCount]);

  const handleSharePicker = useCallback(() => {
    if (!listing) return;
    const payload = buildListingSharePayload(listing, formatPrice, t, {
      priceHistory,
      saveCount,
    });
    void quickShare(payload, shareSheetRef, { forcePicker: true });
  }, [listing, formatPrice, t, priceHistory, saveCount]);

  const handleToggleFavorite = useCallback(() => {
    hapticLight();
    toggleFavorite();
  }, [toggleFavorite]);

  const handleOpenMap = useCallback(() => {
    if (!listing) return;
    hapticLight();
    openListingOnMap(listing.id, listing.lat, listing.lng);
  }, [listing, openListingOnMap]);

  const handleOpenNeighborhood = useCallback(() => {
    hapticLight();
    if (!listing) return;
    neighborhoodRef.current?.open(listing.lat, listing.lng, listing.id);
  }, [listing]);

  const handleCallAgent = useCallback(() => {
    const publicPhone = getPublicPhone(listing?.users ?? null);
    if (publicPhone) {
      if (listing) void recordListingEvent(listing.id, 'contact_call');
      Linking.openURL(`tel:${publicPhone}`);
    }
  }, [listing]);

  const handleReportPress = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const data = await fetchListingById(id);
      setListing(data);
      if (data) {
        const median = await fetchAreaMedianPrice(data.district, data.rooms, data.type);
        setMedianPrice(median);
        const history = await fetchPriceHistory(id);
        setPriceHistory(history as PriceHistoryEntry[]);
        const engagement = await fetchListingEngagement(id);
        setSaveCount(engagement?.saveCount ?? null);

        if (data.users?.id) {
          const count = await fetchActiveListingCount(data.users.id);
          setActiveCount(count);
        }

        if (!isDemoId(id)) {
          // Server-side counter: deduplicated per viewer, owner's own views excluded.
          void recordListingEvent(id, 'view');
        }
      }
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const submitFlag = async (reason: FlagReason) => {
    if (!listing) return;
    // Reports need an account: anonymous reports let anyone take listings down.
    if (!session?.user?.id) {
      sheetRef.current?.close();
      Alert.alert(t('flags.signInTitle'), t('flags.signInBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('flags.signIn'), onPress: () => router.push('/auth/welcome') },
      ]);
      return;
    }
    try {
      const deviceId = await getDeviceId();
      const { error } = await supabase.from('flags').insert({
        listing_id: listing.id,
        user_id: session.user.id,
        reason,
        device_id: deviceId,
      });
      sheetRef.current?.close();
      if (error?.code === '23505') {
        Alert.alert(t('flags.already'));
        return;
      }
      if (error) throw error;
      Alert.alert(t('flags.thanks'));
    } catch (error) {
      logger.warn('Flag submission failed', { extra: { error } });
      Alert.alert(t('common.error'), t('flags.failed'));
    }
  };

  if (invalidId) {
    return (
      <SafeScreen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('common.error')} backFallbackHref="/(tabs)/map" />
        <View style={styles.centered}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', marginBottom: spacing.md }}>
            {t('common.error')}
          </Text>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl }}>
            {t('listing.invalidLink')}
          </Text>
        </View>
      </SafeScreen>
    );
  }

  if (loading || !listing) {
    return (
      <SafeScreen edges={['left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('common.loading')} backFallbackHref="/(tabs)/map" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  const agent = listing.users;
  const demo = isDemoId(listing.id);
  const floorText =
    listing.floor != null
      ? `${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ''}`
      : '—';

  const transactionKey =
    listing.type === 'rent' ? 'filters.rent' : listing.type === 'lease' ? 'filters.lease' : 'filters.sale';
  const badgeVariant = listing.type === 'buy' ? 'buy' : 'rent';

  return (
    <View style={styles.screen}>
      <View style={styles.carouselHost}>
        <ListingCarousel photos={listing.listing_photos ?? []} />
        <View style={[styles.backOverlay, { top: insets.top + spacing.xs }]} pointerEvents="box-none">
          <FrostedView style={styles.backChip} intensity={80}>
            <BackButton fallbackHref="/(tabs)/map" />
          </FrostedView>
        </View>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl }}>
        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            <View style={styles.iconRow}>
              {demo ? null : (
              <Pressable
                accessibilityLabel={t('listing.share')}
                onPress={handleSharePress}
                onLongPress={handleSharePicker}
                delayLongPress={280}
                style={styles.iconBtn}
              >
                <Ionicons name="share-outline" size={24} color={colors.text} />
              </Pressable>
              )}
              <Pressable
                accessibilityLabel={t('favorites.add')}
                onPress={handleToggleFavorite}
                style={styles.iconBtn}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? colors.danger : colors.text} />
              </Pressable>
            </View>
          </View>
          <PriceBadge price={listing.price} medianPrice={medianPrice} />
          <Badge label={t(transactionKey)} variant={badgeVariant} />
          <View style={styles.freshness}>
            <FreshnessLabel listing={listing} />
          </View>
          {demo ? <DemoListingNotice /> : null}

          <Text style={styles.stats}>
            {listing.rooms > 0 ? `${listing.rooms} ${t('common.rooms')} · ` : ''}
            {listing.area_m2} {t('common.area')} · {floorText} · {listing.district}
          </Text>

          {listing.description ? (
            <>
              <Text style={styles.sectionTitle}>{t('listing.description')}</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          ) : null}

          <PropertyInfoSection listing={listing} locale={i18n.language} usdRate={usdRate} />

          <ListingToolLinks listing={listing} />

          <ListingLocationPreview
            lat={listing.lat}
            lng={listing.lng}
            title={t('listing.location')}
            subtitle={t('listing.openMap')}
            onPress={handleOpenMap}
          />

          <Pressable
            onPress={handleOpenNeighborhood}
            style={styles.neighborhoodLink}
          >
            <Text style={styles.neighborhoodLinkText}>{t('listing.neighborhoodExplore')}</Text>
          </Pressable>

          {priceHistory.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>{t('listing.priceHistory')}</Text>
              {priceHistory.map((entry) => (
                <Text key={entry.id} style={styles.historyRow}>
                  {formatPrice(entry.old_price)} → {formatPrice(entry.new_price)} ·{' '}
                  {formatDate(entry.changed_at, i18n.language)}
                </Text>
              ))}
            </>
          ) : null}

          {agent ? (
            <>
              <Text style={styles.sectionTitle}>{t('listing.agent')}</Text>
              <AgentCard agent={agent} activeCount={activeCount} />
            </>
          ) : null}

          <View style={styles.actions}>
            {getPublicPhone(agent) ? (
              <Pressable style={styles.actionBtn} onPress={handleCallAgent}>
                <Text style={styles.actionText}>{t('common.call')}</Text>
              </Pressable>
            ) : null}
            {demo ? null : (
              <>
                <Pressable
                  style={styles.actionBtn}
                  onPress={handleSharePress}
                  onLongPress={handleSharePicker}
                  delayLongPress={280}
                >
                  <Text style={styles.actionText}>{t('listing.share')}</Text>
                </Pressable>
                <Pressable style={styles.reportBtn} onPress={handleReportPress}>
                  <Text style={styles.reportText}>{t('common.report')}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        bottomInset={Math.max(insets.bottom, spacing.sm)}
        style={{ zIndex: SHEET_Z_INDEX }}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        {...BOTTOM_SHEET_GESTURE_PROPS}
      >
        <BottomSheetView style={styles.sheet}>
          <Text style={styles.sheetTitle}>{t('flags.title')}</Text>
          {(['already_rented', 'wrong_price', 'fake_photos', 'duplicate'] as FlagReason[]).map((reason) => (
            <Pressable key={reason} style={styles.flagOption} onPress={() => submitFlag(reason)}>
              <Text style={styles.flagText}>{t(`flags.${reason === 'already_rented' ? 'alreadyRented' : reason === 'wrong_price' ? 'wrongPrice' : reason === 'fake_photos' ? 'fakePhotos' : 'duplicate'}`)}</Text>
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheet>
      <NeighborhoodSheet ref={neighborhoodRef} />
      <ShareSheet ref={shareSheetRef} />
    </View>
  );
}

export default function ListingDetailScreen() {
  return (
    <ErrorBoundary context="ListingDetailScreen">
      <ListingDetailScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  freshness: { marginTop: spacing.sm },
  screen: { flex: 1, backgroundColor: colors.background },
  carouselHost: { position: 'relative' },
  backOverlay: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 2,
  },
  backChip: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, flex: 1 },
  iconRow: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { padding: spacing.xs },
  stats: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm, color: colors.text },
  description: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  historyRow: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl },
  actionBtn: { flex: 1, minWidth: '45%', backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  actionText: { color: colors.surface, fontWeight: '700' },
  reportBtn: { width: '100%', padding: spacing.md, alignItems: 'center' },
  reportText: { color: colors.danger, fontWeight: '600' },
  sheet: { padding: spacing.md },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  flagOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  flagText: { fontSize: fontSize.md, color: colors.text },
  neighborhoodLink: { marginTop: spacing.sm, paddingVertical: spacing.xs },
  neighborhoodLinkText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
});
