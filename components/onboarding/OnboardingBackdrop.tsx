import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MapView } from '@/components/map/MapView';
import { MAP_COVERAGE_CENTER } from '@/lib/constants';
import { useListingsCache } from '@/lib/context/ListingsContext';
import { fixedColors } from '@/lib/design/colors';

const noop = () => undefined;

interface OnboardingBackdropProps {
  /** The goal step dims the map further so the choices read clearly. */
  dim?: boolean;
}

/**
 * The product as the background for both onboarding steps: the live Tashkent map with real
 * prices. Mounted once, so moving to the next step doesn't reload the map.
 */
export function OnboardingBackdrop({ dim = false }: OnboardingBackdropProps) {
  const { width, height } = useWindowDimensions();
  const { mapPoints, filters, loadListingsIfNeeded } = useListingsCache();

  useEffect(() => {
    void loadListingsIfNeeded();
  }, [loadListingsIfNeeded]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <MapView
        listings={mapPoints}
        listingCategory={filters.category}
        onListingPress={noop}
        initialCenter={{ ...MAP_COVERAGE_CENTER.city, zoom: 12.5 }}
        showMarkers
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="onb-scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fixedColors.ink} stopOpacity="0.3" />
            <Stop offset="0.35" stopColor={fixedColors.ink} stopOpacity="0" />
            <Stop offset="0.6" stopColor={fixedColors.ink} stopOpacity="0.78" />
            <Stop offset="0.75" stopColor={fixedColors.ink} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#onb-scrim)" />
      </Svg>
      {dim ? <Animated.View entering={FadeIn.duration(300)} style={[StyleSheet.absoluteFill, styles.dim]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(10,10,10,0.55)' },
});
