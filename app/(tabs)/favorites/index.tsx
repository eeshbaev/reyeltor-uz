import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteListingCard } from '@/components/favorites/FavoriteListingCard';
import { FavoritesAmbientBackground } from '@/components/favorites/FavoritesAmbientBackground';
import { FavoritesEmptyState } from '@/components/favorites/FavoritesEmptyState';
import { FavoritesScreenHeader } from '@/components/favorites/FavoritesScreenHeader';
import { FavoritesSegment, type FavoritesTab } from '@/components/favorites/FavoritesSegment';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { SavedSearchesPanel } from '@/components/savedSearches/SavedSearchesPanel';
import { AppText } from '@/components/ui/AppText';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { FavoriteListingCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/context/AuthContext';
import { useGuestFavoriteAuth } from '@/lib/context/GuestFavoriteAuthContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useWindowClass } from '@/lib/design/windowClass';
import { subscribeFavoritesChanged } from '@/lib/favorites/events';
import { loadFavoriteListings, type FavoriteListing } from '@/lib/favorites/loadFavoriteListings';
import { useSavedSearches } from '@/lib/hooks/useSavedSearches';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { sheetOverlayLayerStyle } from '@/lib/sheetChrome';
import { useTheme } from '@/lib/theme';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const columns = useWindowClass() === 'compact' ? 1 : 2;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { openGuestSignIn } = useGuestFavoriteAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<FavoritesTab>(params.tab === 'searches' ? 'searches' : 'listings');
  const { searches, refetch: refetchSearches } = useSavedSearches();
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const [listings, setListings] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  useSheetOverlay('favorites-detail', detailOpen || neighborhoodOpen);

  const loadFavorites = useCallback(async () => {
    if (!session?.user?.id) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const next = await loadFavoriteListings(session.user.id);
      setListings(next);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
      if (session?.user?.id) void refetchSearches();
    }, [loadFavorites, refetchSearches, session?.user?.id]),
  );

  useEffect(
    () =>
      subscribeFavoritesChanged(() => {
        void loadFavorites();
      }),
    [loadFavorites],
  );

  useEffect(() => {
    if (params.tab === 'searches' || params.tab === 'listings') setTab(params.tab);
  }, [params.tab]);

  const savedCount = listings.filter((item) => !item.unavailable).length;
  const listBottom = insets.bottom + TAB_BAR_CLEARANCE + spacing.md;
  const unseenMatches = useMemo(() => searches.reduce((sum, search) => sum + search.newMatches, 0), [searches]);

  const header = (
    <View>
      <FavoritesScreenHeader count={savedCount} />
      <View style={styles.segmentWrap}>
        <FavoritesSegment
          tab={tab}
          listingsLabel={t('savedSearches.tabListings')}
          searchesLabel={t('savedSearches.tabSearches')}
          listingsCount={savedCount}
          searchesCount={searches.length}
          searchesBadge={unseenMatches}
          onChange={setTab}
        />
      </View>
    </View>
  );

  if (authLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <FavoritesEmptyState
        onSignIn={openGuestSignIn}
        onExploreMap={() => router.push('/(tabs)/map')}
      />
    );
  }

  if (tab === 'searches') {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <FavoritesAmbientBackground />
        <SavedSearchesPanel header={header} bottomPadding={listBottom} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <FavoritesAmbientBackground />
        <View style={styles.loadingHeader}>{header}</View>
        <View style={styles.loadingList}>
          <FavoriteListingCardSkeleton />
          <FavoriteListingCardSkeleton />
        </View>
      </View>
    );
  }

  if (listings.length === 0) {
    return <FavoritesEmptyState header={header} onExploreMap={() => router.push('/(tabs)/map')} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FavoritesAmbientBackground />
      <FlashList
        data={listings}
        renderScrollComponent={ScrollView}
        ListHeaderComponent={header}
        ListFooterComponent={
          savedCount > 0 && savedCount < 4 ? (
            <View style={[styles.footerTip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <AppText variant="caption" color="secondary" style={styles.footerTipText}>
                {t('favorites.compareHint')}
              </AppText>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: listBottom }}
        keyExtractor={(item) => item.id}
        // Two columns from medium windows up (tablets, unfolded foldables) — manual L-06.
        key={columns}
        numColumns={columns}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={columns > 1 ? styles.gridCell : undefined}>
            <FavoriteListingCard
              listing={item}
              unavailable={item.unavailable}
              onPress={() => !item.unavailable && detailRef.current?.open(item.id)}
            />
          </View>
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
  gridCell: { flex: 1, paddingHorizontal: spacing.xs },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    marginBottom: spacing.md,
  },
  loadingHeader: {
    paddingHorizontal: spacing.md,
  },
  loadingList: {
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  separator: {
    height: spacing.lg,
  },
  footerTip: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerTipText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
