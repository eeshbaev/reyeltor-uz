import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackScreenHeader } from '@/components/navigation/StackScreenHeader';
import { MyListingCard } from '@/components/profile/MyListingCard';
import { MyListingsEmptyState } from '@/components/profile/MyListingsEmptyState';
import { MyListingsSegment, type MyListingsTab } from '@/components/profile/MyListingsSegment';
import { PriceUpdateModal } from '@/components/profile/PriceUpdateModal';
import { ShareCardModal } from '@/components/share/ShareCardModal';
import { ActionMenu, type ActionMenuItem } from '@/components/ui/ActionMenu';
import { AppText } from '@/components/ui/AppText';
import { getCoinCost } from '@/lib/coins';
import { useAuth } from '@/lib/context/AuthContext';
import { spacing } from '@/lib/design/spacing';
import { showActionError } from '@/lib/error/actionError';
import { onValueMoment } from '@/lib/growth/ratingPrompt';
import { hapticSuccess } from '@/lib/haptics';
import { fetchActiveListingCount } from '@/lib/hooks/useListings';
import { scheduleListingNotifications } from '@/lib/notifications';
import { serverErrorCode } from '@/lib/serverErrors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ArchivedReason, Listing, ListingWithPhotos } from '@/types';

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState<MyListingsTab>('active');
  const [active, setActive] = useState<ListingWithPhotos[]>([]);
  const [archived, setArchived] = useState<ListingWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareListing, setShareListing] = useState<ListingWithPhotos | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [priceListing, setPriceListing] = useState<ListingWithPhotos | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);

  const updatePrice = async (listing: ListingWithPhotos, price: number) => {
    setSavingPrice(true);
    // Price edits renew expiry (on_listing_edited), are logged in price history (favoriters get
    // the existing price-change alert), and an owner updating the price is also confirming availability.
    const { error } = await supabase.from('listings').update({ price }).eq('id', listing.id);
    if (!error) {
      await supabase.rpc('confirm_listing_available', { p_listing_id: listing.id });
    }
    setSavingPrice(false);
    if (error) {
      showActionError(t, 'updatePrice', error);
      return;
    }
    setPriceListing(null);
    hapticSuccess();
    await load();
  };

  const confirmAvailable = async (listing: ListingWithPhotos) => {
    setConfirmingId(listing.id);
    // Server sets the confirmation date and renews the 90-day expiry.
    const { error } = await supabase.rpc('confirm_listing_available', { p_listing_id: listing.id });
    setConfirmingId(null);
    if (error) {
      showActionError(t, 'confirmListing', error);
      return;
    }
    hapticSuccess();
    await load();
  };

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data: activeData } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('posted_at', { ascending: false });
    const { data: archivedData } = await supabase
      .from('listings')
      .select('*, listing_photos(*)')
      .eq('user_id', session.user.id)
      .eq('status', 'archived')
      .order('archived_at', { ascending: false });
    setActive((activeData ?? []) as ListingWithPhotos[]);
    setArchived((archivedData ?? []) as ListingWithPhotos[]);
    await scheduleListingNotifications((activeData ?? []) as Listing[]);
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const archiveListing = async (id: string, reason: ArchivedReason) => {
    await supabase
      .from('listings')
      .update({
        status: 'archived',
        archived_reason: reason,
        archived_at: new Date().toISOString(),
        deletes_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', id);
    await load();
    await refreshProfile();
    // A deal closed: the app did its job. The rating module decides whether it is the right time.
    if (reason === 'rented' || reason === 'sold') void onValueMoment('listing_closed');
  };

  // ActionMenu, not Alert: Android's system alert shows at most 3 buttons and dropped one of these.
  const [manageListing, setManageListing] = useState<ListingWithPhotos | null>(null);
  const confirmArchive = (listing: ListingWithPhotos) => setManageListing(listing);
  const manageItems: ActionMenuItem[] = manageListing
    ? [
        { key: 'rented', icon: 'key-outline', label: t('listing.markRented'), onPress: () => void archiveListing(manageListing.id, 'rented') },
        { key: 'sold', icon: 'checkmark-done-outline', label: t('listing.markSold'), onPress: () => void archiveListing(manageListing.id, 'sold') },
        { key: 'price', icon: 'pricetag-outline', label: t('priceUpdate.title'), onPress: () => setPriceListing(manageListing) },
        { key: 'archive', icon: 'archive-outline', label: t('listing.archive'), destructive: true, onPress: () => void archiveListing(manageListing.id, 'manually_archived') },
      ]
    : [];

  const reactivateListing = async (listing: ListingWithPhotos) => {
    if (!session?.user?.id || !profile) return;
    const activeCount = await fetchActiveListingCount(session.user.id);
    const cost = getCoinCost(activeCount);
    if (profile.coin_balance < cost) {
      Alert.alert(t('listing.notEnoughCoins'), t('listing.earnMore'));
      return;
    }

    // The database charges the reactivation cost and resets expiry atomically.
    const { error } = await supabase
      .from('listings')
      .update({ status: 'active', archived_reason: null, archived_at: null, deletes_at: null })
      .eq('id', listing.id);

    await refreshProfile();
    if (error) {
      if (serverErrorCode(error) === 'insufficient_coins') {
        Alert.alert(t('listing.notEnoughCoins'), t('listing.earnMore'));
      } else {
        showActionError(t, 'reactivateListing', error);
      }
      await load();
      return;
    }
    await load();
    setTab('active');
  };

  const reactivateCost = active.length > 0 ? getCoinCost(active.length) : 0;
  const listings = tab === 'active' ? active : archived;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StackScreenHeader title={t('profile.myListings')} backHref="/(tabs)/profile" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StackScreenHeader title={t('profile.myListings')} backHref="/(tabs)/profile" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
      >
        <View style={styles.hero}>
          <AppText variant="body" color="secondary">
            {t('profile.myListingsSubtitle')}
          </AppText>
          <MyListingsSegment
            tab={tab}
            activeCount={active.length}
            archivedCount={archived.length}
            activeLabel={t('common.active')}
            archivedLabel={t('common.archived')}
            onChange={setTab}
          />
        </View>

        {listings.length === 0 ? (
          <MyListingsEmptyState
            variant={tab}
            onPost={tab === 'active' ? () => router.push('/(tabs)/post') : undefined}
          />
        ) : (
          <View style={styles.list}>
            {listings.map((listing) => (
              <MyListingCard
                key={listing.id}
                listing={listing}
                variant={tab}
                reactivateCost={reactivateCost}
                canReactivate={!profile || profile.coin_balance >= reactivateCost}
                onPress={() => router.push(`/listing/${listing.id}`)}
                onManage={tab === 'active' ? () => confirmArchive(listing) : undefined}
                onPerformance={tab === 'active' ? () => router.push({ pathname: '/profile/listing-performance', params: { id: listing.id } }) : undefined}
                onShareCard={tab === 'active' ? () => setShareListing(listing) : undefined}
                onConfirmAvailable={tab === 'active' ? () => void confirmAvailable(listing) : undefined}
                confirming={confirmingId === listing.id}
                onUpdatePrice={tab === 'active' ? () => setPriceListing(listing) : undefined}
                onReactivate={tab === 'archived' ? () => void reactivateListing(listing) : undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <ShareCardModal listing={shareListing} onClose={() => setShareListing(null)} />
      <ActionMenu
        visible={manageListing !== null}
        title={t('profile.manageListing')}
        items={manageItems}
        onClose={() => setManageListing(null)}
      />
      <PriceUpdateModal
        listing={priceListing}
        saving={savingPrice}
        onCancel={() => setPriceListing(null)}
        onSave={(price) => priceListing && void updatePrice(priceListing, price)}
      />
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
  });
}
