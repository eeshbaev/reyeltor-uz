import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CurrencyToggle } from '@/components/map/CurrencyToggle';
import { DrawAreaButton } from '@/components/map/DrawAreaButton';
import { FilterButton } from '@/components/map/FilterButton';
import { JumpingEmblem } from '@/components/brand/JumpingEmblem';
import { FilterSheet } from '@/components/map/FilterSheet';
import { MapListingCarousel, MAP_LISTING_CAROUSEL_HEIGHT, mapListingCarouselBottomOffset } from '@/components/map/MapListingCarousel';
import { MapNoResultsOverlay } from '@/components/map/MapNoResultsOverlay';
import { MapView, type MapViewRef } from '@/components/map/MapView';
import { PenDrawOverlay } from '@/components/map/PenDrawOverlay';
import { ListingDetailSheet, type ListingDetailSheetRef } from '@/components/listing/ListingDetailSheet';
import { AppText } from '@/components/ui/AppText';
import { FrostedView } from '@/components/ui/FrostedView';
import {
  FILTER_TOOLTIP_KEY,
  LISTING_MAP_FOCUS_ZOOM,
  MAP_COVERAGE_CENTER,
} from '@/lib/constants';
import { spacing } from '@/lib/design/spacing';
import { buildFiltersForMapArea } from '@/lib/map/areaFilter';
import { countActiveFilters, resetAreaSearch, resetSearchFiltersPreservingArea, shouldShowDistrictMarketStats } from '@/lib/filters';
import { useDisplayCurrency } from '@/lib/context/DisplayCurrencyContext';
import { useMapFocus } from '@/lib/context/MapFocusContext';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { useSheetOverlay } from '@/lib/hooks/useSheetOverlay';
import { buildDistrictMarketLabelForCategory } from '@/lib/market/tashkentDistrictMarket';
import { mapOverlayTop } from '@/lib/mapChrome';
import { useTheme } from '@/lib/theme';
import { DEFAULT_FILTERS, type ListingFilters, type MapAreaPolygon } from '@/types';

export default function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const controlsTop = mapOverlayTop(insets);
  const sheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapViewRef>(null);
  const detailRef = useRef<ListingDetailSheetRef>(null);
  const { filters, setFilters, resetFilters, mapPoints, allListings, filteredListings, usdRate, loading } = useListingsCache();
  const { displayCurrency } = useDisplayCurrency();
  const { focusVersion, consumeFocus } = useMapFocus();
  const [draftFilters, setDraftFilters] = useState(filters);
  const [showTooltip, setShowTooltip] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [drawArea, setDrawArea] = useState<MapAreaPolygon | null>(filters.mapArea);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [neighborhoodOpen, setNeighborhoodOpen] = useState(false);
  const [focusedListingId, setFocusedListingId] = useState<string | null>(null);
  const mapChromeHidden = filterSheetOpen || detailSheetOpen || neighborhoodOpen;
  useSheetOverlay('map-sheets', mapChromeHidden);
  const filterCount = countActiveFilters(filters);
  const showDistrictMarketStats = shouldShowDistrictMarketStats(filters);
  const showMapMarkers = mapPoints.length > 0 && !filterSheetOpen && !detailSheetOpen && !drawMode;
  const showListingCarousel = !drawMode && !detailSheetOpen && !neighborhoodOpen;
  const carouselBottom = mapListingCarouselBottomOffset(insets.bottom);
  const sheetsAboveCarousel = filterSheetOpen;
  const showNoResults = !loading && filteredListings.length === 0 && showListingCarousel;

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
    setFocusedListingId(null);
    mapRef.current?.flyToCoverage({
      latitude: target.lat,
      longitude: target.lng,
      zoom: LISTING_MAP_FOCUS_ZOOM,
    });
  }, [focusVersion, consumeFocus]);

  const dismissTooltip = async () => {
    setShowTooltip(false);
    await AsyncStorage.setItem(FILTER_TOOLTIP_KEY, '1');
  };

  const openFilters = useCallback(() => {
    detailRef.current?.close();
    setDraftFilters(filters);
    sheetRef.current?.expand();
    dismissTooltip();
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    setDrawArea(draftFilters.mapArea);
    sheetRef.current?.close();
  }, [draftFilters, setFilters]);

  const handleFilterChange = useCallback(
    (next: ListingFilters) => {
      setDraftFilters(next);
      if (next.category !== filters.category) {
        setFilters(next);
      }
    },
    [filters.category, setFilters],
  );

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

      {!mapChromeHidden && !drawMode ? (
        <View style={[styles.brandMark, { top: controlsTop }]} pointerEvents="none">
          <JumpingEmblem size={42} jumpHeight={10} pauseMs={1200} />
        </View>
      ) : null}

      {!mapChromeHidden ? (
        <View style={[styles.topLeft, { top: controlsTop }]} pointerEvents={drawMode ? 'none' : 'box-none'}>
          <CurrencyToggle />
          <DrawAreaButton active={drawMode} onPress={toggleDrawMode} />
        </View>
      ) : null}

      {!mapChromeHidden ? (
        <View style={[styles.topRight, { top: controlsTop }]} pointerEvents={drawMode ? 'none' : 'box-none'}>
          <FilterButton count={filterCount} onPress={openFilters} />
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

      <View style={styles.sheetLayer} pointerEvents={mapChromeHidden ? 'box-none' : 'none'}>
        <FilterSheet
          ref={sheetRef}
          filters={draftFilters}
          onChange={handleFilterChange}
          onApply={applyFilters}
          onClear={clearFilters}
          allListings={allListings}
          onIndexChange={(index) => setFilterSheetOpen(index >= 0)}
        />
        <ListingDetailSheet
          ref={detailRef}
          onIndexChange={(index) => {
            setDetailSheetOpen(index >= 0);
            if (index < 0) setFocusedListingId(null);
          }}
          onNeighborhoodIndexChange={(index) => setNeighborhoodOpen(index >= 0)}
        />
      </View>

      {Platform.OS === 'android' && !sheetsAboveCarousel ? (
        <Pressable
          style={[styles.fab, { bottom: carouselBottom + (showListingCarousel ? MAP_LISTING_CAROUSEL_HEIGHT + spacing.sm : 0) }]}
          onPress={() => router.push('/(tabs)/post')}
        >
          <FrostedView style={styles.fabInner}>
            <AppText variant="h2" color="accent">
              +
            </AppText>
          </FrostedView>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapLayer: { flex: 1, zIndex: 0, overflow: 'hidden' },
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
  },
  brandMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9,
  },
  drawHint: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 11 },
  drawHintInner: { padding: spacing.sm, borderRadius: 12, alignSelf: 'flex-start', maxWidth: 280 },
  tooltip: { position: 'absolute', right: spacing.md, zIndex: 11, maxWidth: 220 },
  tooltipInner: { padding: spacing.sm, borderRadius: 12 },
  sheetLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  fab: { position: 'absolute', right: spacing.md, zIndex: 10 },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
