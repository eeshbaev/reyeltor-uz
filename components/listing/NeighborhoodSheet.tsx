import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import {
  getNearbyAmenities,
  groupAmenitiesByCategory,
  type AmenityCategory,
} from '@/lib/neighborhood/amenities';
import { hapticLight } from '@/lib/haptics';
import { useOpenListingOnMap } from '@/lib/hooks/useOpenListingOnMap';
import { getStaticMapUrl } from '@/lib/supabase';
import { SHEET_BEHIND_TAB_Z_INDEX_NESTED, sheetBottomInset } from '@/lib/sheetChrome';
import { BOTTOM_SHEET_GESTURE_PROPS } from '@/lib/gestures';
import { spacing, useTheme } from '@/lib/theme';

export interface NeighborhoodSheetRef {
  open: (lat: number, lng: number, listingId?: string) => void;
  close: () => void;
}

interface NeighborhoodSheetProps {
  onIndexChange?: (index: number) => void;
}

const CATEGORY_ORDER: AmenityCategory[] = [
  'amenity',
  'transport',
  'education',
  'government',
  'entertainment',
];

const screenHeight = Dimensions.get('window').height;

export const NeighborhoodSheet = forwardRef<NeighborhoodSheetRef, NeighborhoodSheetProps>(
  ({ onIndexChange }, ref) => {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const openListingOnMap = useOpenListingOnMap();
    const sheetRef = useRef<BottomSheet>(null);
    const [coords, setCoords] = useState({ lat: 41.3111, lng: 69.2797 });
    const [listingId, setListingId] = useState<string | null>(null);
    const [sheetIndex, setSheetIndex] = useState(-1);
    const tabBarClearance = sheetBottomInset(insets.bottom);
    const sheetHeight = Math.round(screenHeight * 0.92);

    const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);
    const animationConfigs = useBottomSheetSpringConfigs({
      damping: 72,
      stiffness: 320,
      mass: 0.75,
    });

    const nearby = useMemo(() => getNearbyAmenities(coords.lat, coords.lng, 500), [coords]);
    const grouped = useMemo(() => groupAmenitiesByCategory(nearby), [nearby]);
    const mapUrl = getStaticMapUrl(coords.lat, coords.lng, 400, 220);

    useImperativeHandle(ref, () => ({
      open: (lat, lng, id) => {
        setCoords({ lat, lng });
        setListingId(id ?? null);
        sheetRef.current?.snapToIndex(0);
      },
      close: () => sheetRef.current?.close(),
    }));

    const handleShowOnMap = useCallback(() => {
      if (!listingId) return;
      hapticLight();
      sheetRef.current?.close();
      openListingOnMap(listingId, coords.lat, coords.lng);
    }, [coords.lat, coords.lng, listingId, openListingOnMap]);

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => null,
      [],
    );

    const handleSheetChange = useCallback(
      (index: number) => {
        setSheetIndex(index);
        onIndexChange?.(index);
      },
      [onIndexChange],
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        animationConfigs={animationConfigs}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        bottomInset={0}
        containerStyle={sheetIndex < 0 ? styles.passThrough : undefined}
        style={styles.sheet}
        backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
        {...BOTTOM_SHEET_GESTURE_PROPS}
      >
        <View style={styles.body}>
          <BottomSheetScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance + spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="h2">{t('listing.neighborhoodTitle')}</AppText>
            <AppText variant="caption" color="secondary" style={styles.subtitle}>
              {t('listing.neighborhoodSubtitle', { count: nearby.length })}
            </AppText>

            {mapUrl ? (
              <Pressable
                onPress={listingId ? handleShowOnMap : undefined}
                disabled={!listingId}
                style={[styles.mapWrap, { backgroundColor: theme.colors.border }]}
              >
                <Image source={{ uri: mapUrl }} style={styles.map} contentFit="cover" />
                <View style={styles.pinWrap} pointerEvents="none">
                  <Ionicons name="location" size={30} color={theme.colors.danger} />
                </View>
              </Pressable>
            ) : null}

            {listingId ? (
              <Pressable onPress={handleShowOnMap} style={styles.mapAction}>
                <AppText variant="label" color="accent">
                  {t('listing.openMap')}
                </AppText>
              </Pressable>
            ) : null}

            <AppText variant="caption" color="secondary" style={styles.coords}>
              {t('listing.exactLocation', { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })}
            </AppText>

            {CATEGORY_ORDER.map((category) => {
              const items = grouped[category];
              if (items.length === 0) return null;
              return (
                <View key={category} style={styles.section}>
                  <AppText variant="h3" style={styles.sectionTitle}>
                    {t(`listing.neighborhood.${category}`)}
                  </AppText>
                  {items.map((poi, index) => (
                    <View
                      key={`${poi.id}-${index}`}
                      style={[styles.poiRow, { borderBottomColor: theme.colors.border }]}
                    >
                      <AppText variant="body">{i18n.language === 'uz' ? poi.nameUz : poi.name}</AppText>
                      <AppText variant="caption" color="secondary">
                        {poi.distanceM} m
                      </AppText>
                    </View>
                  ))}
                </View>
              );
            })}

            {nearby.length === 0 ? (
              <AppText variant="body" color="secondary" style={styles.empty}>
                {t('listing.neighborhoodEmpty')}
              </AppText>
            ) : null}

            <Pressable style={styles.closeBtn} onPress={() => sheetRef.current?.close()}>
              <AppText variant="body" color="accent">
                {t('common.back')}
              </AppText>
            </Pressable>
          </BottomSheetScrollView>
        </View>
      </BottomSheet>
    );
  },
);

NeighborhoodSheet.displayName = 'NeighborhoodSheet';

const styles = StyleSheet.create({
  sheet: { zIndex: SHEET_BEHIND_TAB_Z_INDEX_NESTED },
  passThrough: { pointerEvents: 'none' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.md },
  mapWrap: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  map: { width: '100%', height: '100%' },
  pinWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -14 }],
  },
  mapAction: { marginBottom: spacing.sm },
  coords: { marginBottom: spacing.md },
  section: { marginTop: spacing.md },
  sectionTitle: { marginBottom: spacing.sm },
  poiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { textAlign: 'center', marginTop: spacing.lg },
  closeBtn: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.md },
});
