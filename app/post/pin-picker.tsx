import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '@/components/map/MapView';
import type { MapAreaPolygon } from '@/components/map/types';
import { AddressSuggestionsField } from '@/components/post/AddressSuggestionsField';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { LISTING_MAP_FOCUS_ZOOM, TASHKENT_CENTER } from '@/lib/constants';
import { usePin } from '@/lib/context/PinContext';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useCurrentLocation } from '@/lib/hooks/useCurrentLocation';
import { useLocationSearch } from '@/lib/hooks/useLocationSearch';
import { useReverseGeocode } from '@/lib/hooks/useReverseGeocode';
import { fetchBuildingAtPoint } from '@/lib/map/buildingAtPoint';
import { findDistrictAtPoint } from '@/lib/map/districtBoundaries';
import { isExactLocationSuggestion } from '@/lib/map/locationSuggestions';
import { useTheme } from '@/lib/theme';

export default function PinPickerScreen() {
  const { lat, lng, district } = useLocalSearchParams<{ lat?: string; lng?: string; district?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setPin: savePin } = usePin();
  const [pin, setPin] = useState({
    lat: Number(lat ?? TASHKENT_CENTER.latitude),
    lng: Number(lng ?? TASHKENT_CENTER.longitude),
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingPickerMode, setBuildingPickerMode] = useState(false);
  const [buildingOutline, setBuildingOutline] = useState<MapAreaPolygon | null>(null);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [addressOverride, setAddressOverride] = useState<string | null>(null);
  const { requestCurrentLocation, loading: gpsLoading } = useCurrentLocation();

  const detectedDistrict = findDistrictAtPoint(pin.lng, pin.lat) ?? district ?? null;
  const { result: geocoded, loading: geocoding } = useReverseGeocode(
    pin.lat,
    pin.lng,
    i18n.language,
    !addressOverride,
  );
  const { suggestions, loading: searching } = useLocationSearch(
    searchQuery,
    i18n.language,
    searchQuery.trim().length > 0,
  );

  const displayAddress = addressOverride ?? geocoded?.label ?? null;

  const handlePinChange = useCallback((nextLat: number, nextLng: number) => {
    setPin({ lat: nextLat, lng: nextLng });
    setBuildingOutline(null);
    setAddressOverride(null);
  }, []);

  const handleBuildingTap = useCallback(
    async (tapLat: number, tapLng: number) => {
      setBuildingLoading(true);
      try {
        const building = await fetchBuildingAtPoint(tapLat, tapLng);
        if (!building) {
          Alert.alert(t('listing.buildingNotFoundTitle'), t('listing.buildingNotFoundMessage'));
          handlePinChange(tapLat, tapLng);
          return;
        }
        setBuildingOutline(building.outline);
        setPin(building.centroid);
        setAddressOverride(building.label);
      } finally {
        setBuildingLoading(false);
      }
    },
    [handlePinChange, t],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const coords = await requestCurrentLocation();
    if (!coords) return;
    handlePinChange(coords.lat, coords.lng);
  }, [handlePinChange, requestCurrentLocation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.hint,
          { top: insets.top + spacing.sm, backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
        ]}
      >
        <AppText variant="caption" color="secondary" style={styles.hintText}>
          {buildingPickerMode ? t('listing.buildingPickerHint') : t('listing.pinPickerHint')}
        </AppText>
        {detectedDistrict ? (
          <AppText variant="label" style={styles.districtLabel}>
            {detectedDistrict}
          </AppText>
        ) : null}
        <View style={styles.addressRow}>
          {geocoding || buildingLoading ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <AppText variant="caption" color="secondary">
                {buildingLoading ? t('listing.buildingLookingUp') : t('listing.addressLookingUp')}
              </AppText>
            </>
          ) : displayAddress ? (
            <>
              <AppText variant="caption" color="secondary">
                {t('listing.suggestedAddress')}
              </AppText>
              <AppText variant="body" style={styles.addressLabel}>
                {displayAddress}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" color="tertiary">
              {t('listing.addressUnavailable')}
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          listings={[]}
          listingCategory="residential"
          onListingPress={() => {}}
          showMarkers={false}
          initialCenter={{
            latitude: pin.lat,
            longitude: pin.lng,
            zoom: LISTING_MAP_FOCUS_ZOOM,
          }}
          pinPicker={{
            lat: pin.lat,
            lng: pin.lng,
            onPinChange: handlePinChange,
            buildingOutline,
            buildingPickerMode,
            onBuildingTap: handleBuildingTap,
          }}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setBuildingPickerMode((value) => !value)}
            style={[
              styles.modeBtn,
              {
                borderColor: buildingPickerMode ? theme.colors.accent : theme.colors.border,
                backgroundColor: buildingPickerMode ? theme.colors.accentSurface : theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name="business-outline"
              size={18}
              color={buildingPickerMode ? theme.colors.accent : theme.colors.secondary}
            />
            <AppText variant="label" color={buildingPickerMode ? 'accent' : 'secondary'}>
              {t('listing.buildingPicker')}
            </AppText>
          </Pressable>

          <Pressable
            onPress={handleUseCurrentLocation}
            disabled={gpsLoading}
            style={[styles.modeBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Ionicons name="navigate" size={18} color={theme.colors.accent} />
            )}
            <AppText variant="label" color="accent">
              {t('listing.useCurrentLocation')}
            </AppText>
          </Pressable>
        </View>

        <AddressSuggestionsField
          value={searchQuery}
          onChangeText={setSearchQuery}
          suggestions={suggestions}
          loading={searching}
          onSelect={(item) => {
            if (isExactLocationSuggestion(item)) {
              handlePinChange(item.lat, item.lng);
              setSearchQuery(item.label);
            }
          }}
        />
        <Button
          label={t('listing.confirmPin')}
          onPress={() => {
            savePin(pin.lat, pin.lng, displayAddress);
            router.back();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  hintText: { textAlign: 'center' },
  districtLabel: { textAlign: 'center', marginTop: spacing.xs },
  addressRow: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  addressLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
  mapWrap: { flex: 1 },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
