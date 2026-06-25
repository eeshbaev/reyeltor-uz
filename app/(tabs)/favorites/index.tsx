import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestPrompt } from '@/components/auth/GuestPrompt';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { ListingCardSkeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/lib/design/spacing';
import { useAuth } from '@/lib/context/AuthContext';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { sheetOverlayLayerStyle } from '@/lib/sheetChrome';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { ListingWithPhotos } from '@/types';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const [listings, setListings] = useState<Array<ListingWithPhotos & { unavailable?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  useSheetOverlay('favorites-detail', detailOpen || neighborhoodOpen);

  const loadFavorites = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', session.user.id);
    const ids = (data ?? []).map((f) => f.listing_id);

    if (ids.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const { data: listingData } = await supabase.from('listings').select('*, listing_photos(*)').in('id', ids);
    const found = new Map((listingData ?? []).map((l) => [l.id, l as ListingWithPhotos]));
    const result = ids.map((id) => {
      const listing = found.get(id);
      if (listing) return listing;
      return {
        id,
        unavailable: true,
        price: 0,
        rooms: 0,
        area_m2: 0,
        district: '',
        type: 'rent' as const,
        user_id: '',
        lat: 0,
        lng: 0,
        status: 'deleted' as const,
      } as ListingWithPhotos & { unavailable: boolean };
    });

    setListings(result);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) loadFavorites();
  }, [loadFavorites, session?.user?.id]);

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: spacing.md }]}>
        <ListingCardSkeleton />
      </View>
    );
  }

  if (!session) {
    return (
      <GuestPrompt title={t('favorites.signInRequired')} subtitle={t('favorites.signInHint')} />
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, padding: spacing.md }]}>
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          illustration="favorites"
          title={t('favorites.empty')}
          cta={t('favorites.exploreMap')}
          onCta={() => router.push('/(tabs)/map')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={listings}
        estimatedItemSize={260}
        renderScrollComponent={ScrollView}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            unavailable={item.unavailable}
            onPress={() => !item.unavailable && detailRef.current?.open(item.id)}
          />
        )}
      />
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
  container: { flex: 1 },
});
