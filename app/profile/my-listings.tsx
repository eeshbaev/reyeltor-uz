import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LISTING_PHOTO_PLACEHOLDER } from '@/lib/listingPhotos';
import { getCoinCost } from '@/lib/coins';
import { useAuth } from '@/lib/context/AuthContext';
import { daysUntil } from '@/lib/format';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { fetchActiveListingCount } from '@/lib/hooks/useListings';
import { scheduleListingNotifications } from '@/lib/notifications';
import { getPhotoUrl, supabase } from '@/lib/supabase';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { ArchivedReason, Listing, ListingWithPhotos } from '@/types';

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { formatPrice } = useFormatPrice();
  const { session, profile, refreshProfile } = useAuth();
  const [active, setActive] = useState<ListingWithPhotos[]>([]);
  const [archived, setArchived] = useState<ListingWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

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
  };

  const reactivateListing = async (listing: ListingWithPhotos) => {
    if (!session?.user?.id || !profile) return;
    const activeCount = await fetchActiveListingCount(session.user.id);
    const cost = getCoinCost(activeCount);
    if (profile.coin_balance < cost) return;

    if (cost > 0) {
      await supabase.from('users').update({ coin_balance: profile.coin_balance - cost }).eq('id', session.user.id);
      await supabase.from('coin_transactions').insert({
        user_id: session.user.id,
        amount: -cost,
        type: 'reactivation',
        listing_id: listing.id,
      });
    }

    await supabase
      .from('listings')
      .update({
        status: 'active',
        archived_reason: null,
        archived_at: null,
        deletes_at: null,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', listing.id);

    await refreshProfile();
    await load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>{t('common.active')}</Text>
      {active.map((listing) => {
        const photo = listing.listing_photos?.sort((a, b) => a.order_index - b.order_index)[0];
        return (
          <View key={listing.id} style={styles.card}>
            <Image
              source={{ uri: photo ? getPhotoUrl(photo.storage_path) : LISTING_PHOTO_PLACEHOLDER }}
              style={styles.thumb}
            />
            <View style={styles.cardBody}>
              <Text style={styles.price}>{formatPrice(listing.price)}</Text>
              <Text style={styles.meta}>{listing.rooms} {t('common.rooms')} · {listing.district}</Text>
              <Text style={styles.meta}>{t('listing.daysUntilExpiry', { days: daysUntil(listing.expires_at) })}</Text>
              <Text style={styles.meta}>{t('listing.views', { count: listing.view_count })}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => router.push(`/listing/${listing.id}`)}>
                  <Text style={styles.link}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable onPress={() => archiveListing(listing.id, 'rented')}>
                  <Text style={styles.link}>{t('listing.markRented')}</Text>
                </Pressable>
                <Pressable onPress={() => archiveListing(listing.id, 'sold')}>
                  <Text style={styles.link}>{t('listing.markSold')}</Text>
                </Pressable>
                <Pressable onPress={() => archiveListing(listing.id, 'manually_archived')}>
                  <Text style={styles.link}>{t('listing.archive')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      <Text style={styles.section}>{t('common.archived')}</Text>
      {archived.map((listing) => (
        <View key={listing.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            <Text style={styles.meta}>{listing.rooms} {t('common.rooms')} · {listing.district}</Text>
            <Text style={styles.badge}>{archivedLabel(t, listing.archived_reason)}</Text>
            {listing.deletes_at ? (
              <Text style={styles.meta}>{t('listing.daysUntilDeletion', { days: daysUntil(listing.deletes_at) })}</Text>
            ) : null}
            <Pressable onPress={() => reactivateListing(listing)}>
              <Text style={styles.link}>{t('listing.reactivate')}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function archivedLabel(t: (key: string) => string, reason: ArchivedReason | null) {
  switch (reason) {
    case 'rented': return t('listing.archivedRented');
    case 'sold': return t('listing.archivedSold');
    case 'expired': return t('listing.archivedExpired');
    default: return t('listing.archivedManual');
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary, marginVertical: spacing.sm },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  thumb: { width: 88, height: 88, backgroundColor: colors.border },
  cardBody: { flex: 1, padding: spacing.sm },
  price: { fontWeight: '700', fontSize: fontSize.md, color: colors.text },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  badge: { fontSize: fontSize.xs, fontWeight: '700', color: colors.accent, marginTop: spacing.xs },
  actions: { marginTop: spacing.sm, gap: spacing.xs },
  link: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },
});
