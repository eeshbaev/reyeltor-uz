import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { AgentCard } from '@/components/listing/AgentCard';
import { ListingCarousel } from '@/components/listing/ListingCarousel';
import { ListingLocationPreview } from '@/components/listing/ListingLocationPreview';
import { NeighborhoodSheet, type NeighborhoodSheetRef } from '@/components/listing/NeighborhoodSheet';
import { PropertyInfoSection } from '@/components/listing/PropertyInfoSection';
import { PriceBadge } from '@/components/listing/PriceBadge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { openTelegramChat } from '@/lib/contact';
import { getDeviceId } from '@/lib/device';
import { isDemoId } from '@/lib/demo';
import { useAuth } from '@/lib/context/AuthContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { formatDate } from '@/lib/format';
import { hapticLight } from '@/lib/haptics';
import { useOpenListingOnMap } from '@/lib/hooks/useOpenListingOnMap';
import { useListingFavorite } from '@/lib/hooks/useListingFavorite';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { fetchAreaMedianPrice, fetchActiveListingCount, fetchListingById, fetchPriceHistory } from '@/lib/hooks/useListings';
import { shareListing } from '@/lib/shareListing';
import { supabase } from '@/lib/supabase';
import { SHEET_Z_INDEX } from '@/lib/sheetChrome';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { FlagReason, ListingWithPhotos, PriceHistoryEntry } from '@/types';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { usdRate } = useListingsCache();
  const { formatPrice } = useFormatPrice();
  const openListingOnMap = useOpenListingOnMap();
  const sheetRef = useRef<BottomSheet>(null);
  const neighborhoodRef = useRef<NeighborhoodSheetRef>(null);
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<ListingWithPhotos | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [medianPrice, setMedianPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const { isFavorite, toggleFavorite } = useListingFavorite(id ?? null);

  const snapPoints = useMemo(() => ['40%'], []);
  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

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

        if (data.users?.id) {
          const count = await fetchActiveListingCount(data.users.id);
          setActiveCount(count);
        }

        if (!isDemoId(id)) {
          await supabase.from('listings').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', id);
        }
      }
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const submitFlag = async (reason: FlagReason) => {
    if (!listing) return;
    const deviceId = await getDeviceId();
    await supabase.from('flags').insert({
      listing_id: listing.id,
      user_id: session?.user?.id ?? null,
      reason,
      device_id: deviceId,
    });
    sheetRef.current?.close();
  };

  if (loading || !listing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const agent = listing.users;
  const floorText =
    listing.floor != null
      ? `${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ''}`
      : '—';

  const transactionKey =
    listing.type === 'rent' ? 'filters.rent' : listing.type === 'lease' ? 'filters.lease' : 'filters.sale';
  const badgeVariant = listing.type === 'buy' ? 'buy' : 'rent';

  return (
    <View style={styles.screen}>
      <ListingCarousel photos={listing.listing_photos ?? []} />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl }}>
        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            <View style={styles.iconRow}>
              <Pressable
                accessibilityLabel={t('listing.share')}
                onPress={async () => {
                  hapticLight();
                  await shareListing(
                    t('listing.shareMessage', {
                      price: formatPrice(listing.price),
                      district: listing.district,
                    }),
                    listing.id,
                    t('listing.shareTitle'),
                  );
                }}
                style={styles.iconBtn}
              >
                <Ionicons name="share-outline" size={24} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityLabel={t('favorites.add')}
                onPress={() => {
                  hapticLight();
                  toggleFavorite();
                }}
                style={styles.iconBtn}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? colors.error : colors.text} />
              </Pressable>
            </View>
          </View>
          <PriceBadge price={listing.price} medianPrice={medianPrice} />
          <Badge label={t(transactionKey)} variant={badgeVariant} />

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

          <ListingLocationPreview
            lat={listing.lat}
            lng={listing.lng}
            title={t('listing.location')}
            subtitle={t('listing.openMap')}
            onPress={() => {
              hapticLight();
              openListingOnMap(listing.id, listing.lat, listing.lng);
            }}
          />

          <Pressable
            onPress={() => {
              hapticLight();
              neighborhoodRef.current?.open(listing.lat, listing.lng, listing.id);
            }}
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
            {agent?.phone ? (
              <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${agent.phone}`)}>
                <Text style={styles.actionText}>{t('common.call')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.actionBtn}
              onPress={() => openTelegramChat(agent?.telegram_username, t('listing.noTelegram'), t('common.telegram'))}
            >
              <Text style={styles.actionText}>{t('common.telegram')}</Text>
            </Pressable>
            <Pressable style={styles.reportBtn} onPress={() => sheetRef.current?.expand()}>
              <Text style={styles.reportText}>{t('common.report')}</Text>
            </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
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
  actionBtn: { flex: 1, minWidth: '45%', backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10, alignItems: 'center' },
  actionText: { color: colors.surface, fontWeight: '700' },
  reportBtn: { width: '100%', padding: spacing.md, alignItems: 'center' },
  reportText: { color: colors.error, fontWeight: '600' },
  sheet: { padding: spacing.md },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.md },
  flagOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  flagText: { fontSize: fontSize.md, color: colors.text },
  neighborhoodLink: { marginTop: spacing.sm, paddingVertical: spacing.xs },
  neighborhoodLinkText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
});
