import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { CurrencyToggle } from '@/components/map/CurrencyToggle';
import { DrawAreaButton } from '@/components/map/DrawAreaButton';
import { FilterButton } from '@/components/map/FilterButton';
import { FilterSheet } from '@/components/map/FilterSheet';
import { MapListingCarousel, MAP_LISTING_CAROUSEL_HEIGHT, mapListingCarouselBottomOffset } from '@/components/map/MapListingCarousel';
import { MapNoResultsOverlay } from '@/components/map/MapNoResultsOverlay';
import { MapView, type MapViewRef } from '@/components/map/MapView';
import { MapZoomControls } from '@/components/map/MapZoomControls';
import { PenDrawOverlay } from '@/components/map/PenDrawOverlay';
import { SaveSearchControl } from '@/components/savedSearches/SaveSearchControl';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import {
  FILTER_TOOLTIP_KEY,
  LISTING_MAP_FOCUS_ZOOM,
  MAP_COVERAGE_CENTER,
} from '@/lib/constants';
import { useDisplayCurrency } from '@/lib/context/DisplayCurrencyContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { useMapFocus } from '@/lib/context/MapFocusContext';
import { spacing } from '@/lib/design/spacing';
import { countActiveFilters, filtersToRevealListing, resetAreaSearch, resetSearchFiltersPreservingArea, shouldShowDistrictMarketStats } from '@/lib/filters';
import { useLastSearchSync } from '@/lib/hooks/useLastSearchSync';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { buildFiltersForMapArea } from '@/lib/map/areaFilter';
import { mapOverlayTop } from '@/lib/mapChrome';
import { buildDistrictMarketLabelForCategory } from '@/lib/market/tashkentDistrictMarket';
import { DEFAULT_FILTERS, type ListingCategory, type ListingFilters, type ListingType, type MapAreaPolygon } from '@/types';

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    postedListingId?: string;
    postedLat?: string;
    postedLng?: string;
    postedCategory?: ListingCategory;
    postedType?: ListingType;
    postedDistrict?: string;
  }>();
  const insets = useSafeAreaInsets();
  const controlsTop = mapOverlayTop(insets);
  const sheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapViewRef>(null);
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const { filters, setFilters, resetFilters, mapPoints, allListings, filteredListings, usdRate, loading, loadListingsIfNeeded, liveFetchFailed, refetch } = useListingsCache();
  // New listings matching the latest map search are pushed (Favorites → Searches shows it).
  useLastSearchSync();

  // Lazy-load listings when map screen mounts
  useEffect(() => {
    loadListingsIfNeeded();
  }, [loadListingsIfNeeded]);
  const { displayCurrency } = useDisplayCurrency();
  const { focusVersion, consumeFocus } = useMapFocus();
  const [draftFilters, setDraftFilters] = useState(filters);
  const [showTooltip, setShowTooltip] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [, setDrawArea] = useState<MapAreaPolygon | null>(filters.mapArea);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterSheetMounted, setFilterSheetMounted] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);
  const [postSuccessVisible, setPostSuccessVisible] = useState(false);
  const postSuccessHandledRef = useRef<string | null>(null);
  // OPTIMIZATION #7: Debounce filter changes to avoid excessive re-renders during slider drags
  const filterChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFilterChangeRef = useRef<ListingFilters | null>(null);
  const mapChromeHidden = filterSheetOpen || neighborhoodOpen;
  useSheetOverlay('map-sheets', neighborhoodOpen);
  const filterCount = countActiveFilters(filters);
  const showDistrictMarketStats = shouldShowDistrictMarketStats(filters);
  const showMapMarkers = mapPoints.length > 0 && !filterSheetOpen && !detailSheetOpen && !drawMode;
  const showListingCarousel = !drawMode && !detailSheetOpen && !neighborhoodOpen;
  const carouselBottom = mapListingCarouselBottomOffset(insets.bottom);
  const sheetsAboveCarousel = filterSheetOpen;
  const showNoResults = !loading && filteredListings.length === 0 && showListingCarousel;
  const showZoomControls = !mapChromeHidden && !drawMode && !detailSheetOpen;
  const zoomControlsBottom =
    carouselBottom + (showListingCarousel ? MAP_LISTING_CAROUSEL_HEIGHT + spacing.sm : spacing.md);

  const focusedListing = useMemo(() => {
    if (!focusedListingId) return null;
    const listing = allListings.find((item) => item.id === focusedListingId);
    if (!listing) return null;
    return {
      id: listing.id,
      lat: listing.lat,
      lng: listing.lng,
      price: listing.price,
      featured: listing.is_featured,
    };
  }, [focusedListingId, allListings]);

  const openListingDetail = useCallback(
    (id: string) => {
      sheetRef.current?.close();
      const listing = allListings.find((item) => item.id === id);
      if (listing) {
        setFocusedListingId(id);
        mapRef.current?.flyToCoverage({
          latitude: listing.lat,
          longitude: listing.lng,
          zoom: LISTING_MAP_FOCUS_ZOOM,
        });
      }
      detailRef.current?.open(id);
    },
    [allListings],
  );

  useEffect(() => {
    setDrawArea(filters.mapArea);
  }, [filters.mapArea]);

  useEffect(() => {
    AsyncStorage.getItem(FILTER_TOOLTIP_KEY).then((v) => {
      if (!v) setShowTooltip(true);
    });
  }, []);

  useEffect(() => {
    const target = consumeFocus();
    if (!target) return;

    detailRef.current?.close();
    setFocusedListingId(target.listingId);
    mapRef.current?.flyToCoverage({
      latitude: target.lat,
      longitude: target.lng,
      zoom: LISTING_MAP_FOCUS_ZOOM,
    });
  }, [focusVersion, consumeFocus]);

  useEffect(() => {
    const listingId = params.postedListingId;
    const lat = params.postedLat ? Number(params.postedLat) : NaN;
    const lng = params.postedLng ? Number(params.postedLng) : NaN;
    if (!listingId || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (postSuccessHandledRef.current === listingId) return;
    postSuccessHandledRef.current = listingId;

    const listing = allListings.find((item) => item.id === listingId);
    const revealTarget =
      listing ??
      (params.postedCategory && params.postedDistrict
        ? {
            category: params.postedCategory,
            type: params.postedType ?? 'rent',
            lat,
            lng,
            district: params.postedDistrict,
          }
        : null);

    if (revealTarget) {
      setFilters(filtersToRevealListing(filters, revealTarget));
    }

    setFocusedListingId(listingId);
    setPostSuccessVisible(true);
    mapRef.current?.flyToCoverage({
      latitude: lat,
      longitude: lng,
      zoom: LISTING_MAP_FOCUS_ZOOM,
    });

    router.setParams({
      postedListingId: undefined,
      postedLat: undefined,
      postedLng: undefined,
      postedCategory: undefined,
      postedType: undefined,
      postedDistrict: undefined,
      posted: undefined,
    });

    const timer = setTimeout(() => setPostSuccessVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [
    allListings,
    filters,
    params.postedCategory,
    params.postedDistrict,
    params.postedLat,
    params.postedListingId,
    params.postedLng,
    params.postedType,
    router,
    setFilters,
  ]);

  const dismissTooltip = async () => {
    setShowTooltip(false);
    await AsyncStorage.setItem(FILTER_TOOLTIP_KEY, '1');
  };

  const openFilters = useCallback(() => {
    detailRef.current?.close();
    setDraftFilters(filters);
    setFilterSheetMounted(true);
    setFilterSheetOpen(true);
    dismissTooltip();
  }, [filters]);

  const handleFilterSheetIndexChange = useCallback((index: number) => {
    setFilterSheetOpen(index >= 0);
    if (index < 0) {
      setFilterSheetMounted(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    setDrawArea(draftFilters.mapArea);
    sheetRef.current?.close();
  }, [draftFilters, setFilters]);

  // OPTIMIZATION #7: Debounce filter changes with 300ms delay
  // This prevents excessive re-renders during slider drags (60+ times/sec → 3-4 times/sec)
  const handleFilterChange = useCallback(
    (next: ListingFilters) => {
      setDraftFilters(next);

      // Always update immediately if category changes (better UX)
      if (next.category !== filters.category) {
        if (filterChangeTimeoutRef.current) {
          clearTimeout(filterChangeTimeoutRef.current);
        }
        setFilters(next);
        pendingFilterChangeRef.current = null;
      } else {
        // For other changes, debounce to avoid excessive re-filtering during slider drags
        pendingFilterChangeRef.current = next;

        if (filterChangeTimeoutRef.current) {
          clearTimeout(filterChangeTimeoutRef.current);
        }

        filterChangeTimeoutRef.current = setTimeout(() => {
          if (pendingFilterChangeRef.current) {
            setFilters(pendingFilterChangeRef.current);
            pendingFilterChangeRef.current = null;
          }
          filterChangeTimeoutRef.current = null;
        }, 300);
      }
    },
    [filters.category, setFilters],
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }
    };
  }, []);

  const clearFilters = useCallback(() => {
    resetFilters();
    setDraftFilters(DEFAULT_FILTERS);
    setDrawArea(null);
    setDrawMode(false);
  }, [resetFilters]);

  const toggleDrawMode = useCallback(() => {
    setDrawMode((prev) => {
      const next = !prev;
      if (next) {
        detailRef.current?.close();
        setFocusedListingId(null);
      }
      return next;
    });
    dismissTooltip();
  }, []);

  const districtDetail = useCallback(
    (district: string) => {
      if (!showDistrictMarketStats) return null;
      return buildDistrictMarketLabelForCategory(
        district,
        filters.category,
        displayCurrency,
        usdRate,
        {
          rent: t('map.avgRent'),
          sale: t('map.avgSale'),
          lease: t('map.avgLease'),
        },
      );
    },
    [showDistrictMarketStats, filters.category, displayCurrency, usdRate, t],
  );

  const handleDrawComplete = useCallback(
    (area: MapAreaPolygon) => {
      setDrawMode(false);
      setDrawArea(area);
      mapRef.current?.flyToArea(area);

      const nextFilters = buildFiltersForMapArea(filters, area);
      setFilters(nextFilters);
      setDraftFilters(nextFilters);
    },
    [filters, setFilters],
  );

  const handleDrawCancel = useCallback(() => {
    setDrawMode(false);
  }, []);

  const handleResetSearchFilters = useCallback(() => {
    const next = resetSearchFiltersPreservingArea(filters);
    setFilters(next);
    setDraftFilters(next);
  }, [filters, setFilters]);

  const handleResetAreaSearch = useCallback(() => {
    const next = resetAreaSearch(filters);
    setFilters(next);
    setDraftFilters(next);
    setDrawArea(null);
    setDrawMode(false);
    mapRef.current?.flyToCoverage(MAP_COVERAGE_CENTER.region);
  }, [filters, setFilters]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomBy(1);
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomBy(-1);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapLayer} pointerEvents={drawMode ? 'none' : 'auto'}>
        <MapView
          ref={mapRef}
          listings={mapPoints}
          listingCategory={filters.category}
          initialCenter={MAP_COVERAGE_CENTER.city}
          drawMode={drawMode}
          searchArea={filters.mapArea}
          onListingPress={openListingDetail}
          showMarkers={showMapMarkers}
          focusedListing={focusedListing}
          districtDetail={districtDetail}
        />
      </View>

      {!mapChromeHidden ? (
        <View style={[styles.topLeft, { top: controlsTop }]} pointerEvents={drawMode ? 'none' : 'box-none'}>
          {!drawMode ? (
            <JumpingEmblem variant="inline" size={44} jumpHeight={7} pauseMs={1400} />
          ) : null}
          <CurrencyToggle />
          <DrawAreaButton active={drawMode} onPress={toggleDrawMode} />
        </View>
      ) : null}

      {!mapChromeHidden ? (
        <View style={[styles.topRight, { top: controlsTop }]} pointerEvents={drawMode ? 'none' : 'box-none'}>
          <FilterButton count={filterCount} onPress={openFilters} />
          {!drawMode ? <SaveSearchControl filters={filters} /> : null}
        </View>
      ) : null}

      {drawMode && !mapChromeHidden ? (
        <View
          style={styles.penDrawLayer}
          pointerEvents="auto"
        >
          <PenDrawOverlay
            mapRef={mapRef}
            onComplete={handleDrawComplete}
            onCancel={handleDrawCancel}
          />
        </View>
      ) : null}

      {drawMode && !mapChromeHidden ? (
        <View style={[styles.drawHint, { top: controlsTop + 56 }]} pointerEvents="none">
          <FrostedView style={styles.drawHintInner}>
            <AppText variant="caption">{t('map.drawHint')}</AppText>
          </FrostedView>
        </View>
      ) : null}

      {showTooltip && !drawMode && !mapChromeHidden ? (
        <Pressable style={[styles.tooltip, { top: controlsTop + 52 }]} onPress={dismissTooltip}>
          <FrostedView style={styles.tooltipInner}>
            <AppText variant="caption">{t('map.filterTooltip')}</AppText>
          </FrostedView>
        </Pressable>
      ) : null}

      {postSuccessVisible && !mapChromeHidden ? (
        <View style={[styles.postSuccess, { top: controlsTop + 52 }]} pointerEvents="none">
          <FrostedView style={styles.postSuccessInner}>
            <AppText variant="caption" color="accent" style={styles.postSuccessText}>
              {t('listing.postSuccess')}
            </AppText>
          </FrostedView>
        </View>
      ) : null}

      {liveFetchFailed && !mapChromeHidden && !drawMode ? (
        <Pressable
          style={[styles.liveNotice, { bottom: zoomControlsBottom }]}
          onPress={() => void refetch()}
          accessibilityRole="button"
        >
          <FrostedView style={styles.liveNoticeInner}>
            <AppText variant="caption">{t('demo.liveUnavailable')}</AppText>
          </FrostedView>
        </Pressable>
      ) : null}

      {showZoomControls ? (
        <View style={[styles.zoomControls, { bottom: zoomControlsBottom }]} pointerEvents="box-none">
          <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        </View>
      ) : null}

      <View pointerEvents={drawMode ? 'none' : 'auto'}>
        <MapListingCarousel
          listings={filteredListings}
          bottomOffset={carouselBottom}
          hidden={!showListingCarousel}
          dimmed={sheetsAboveCarousel}
          onListingPress={openListingDetail}
        />
      </View>

      {showNoResults ? (
        <MapNoResultsOverlay
          listings={allListings}
          filters={filters}
          usdRate={usdRate}
          bottomOffset={carouselBottom}
          onResetFilters={handleResetSearchFilters}
          onResetArea={handleResetAreaSearch}
        />
      ) : null}

      <View style={styles.sheetLayer} pointerEvents="box-none">
        {filterSheetMounted ? (
          <FilterSheet
            ref={sheetRef}
            initialIndex={0}
            filters={draftFilters}
            onChange={handleFilterChange}
            onApply={applyFilters}
            onClear={clearFilters}
            allListings={allListings}
            onIndexChange={handleFilterSheetIndexChange}
          />
        ) : null}
        <ListingDetailSheet
          ref={detailRef}
          onIndexChange={(index) => {
            setDetailSheetOpen(index >= 0);
            if (index < 0) setFocusedListingId(null);
          }}
          onNeighborhoodIndexChange={(index) => setNeighborhoodOpen(index >= 0)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090F' },
  mapLayer: { flex: 1, zIndex: 0, overflow: 'hidden', backgroundColor: '#07090F' },
  penDrawLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  topLeft: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 10,
    gap: spacing.sm,
  },
  topRight: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
    gap: spacing.sm,
  },
  drawHint: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 11 },
  drawHintInner: { padding: spacing.sm, borderRadius: 12, alignSelf: 'flex-start', maxWidth: 280 },
  tooltip: { position: 'absolute', right: spacing.md + 58, zIndex: 11, maxWidth: 220 },
  tooltipInner: { padding: spacing.sm, borderRadius: 12 },
  postSuccess: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 12,
    alignItems: 'center',
  },
  postSuccessInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    maxWidth: 340,
  },
  postSuccessText: { textAlign: 'center', fontWeight: '600' },
  liveNotice: { position: 'absolute', left: spacing.md, right: 72, zIndex: 11 },
  liveNoticeInner: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 12 },
  zoomControls: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 10,
  },
  sheetLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
