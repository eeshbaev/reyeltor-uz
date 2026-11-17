import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform } from 'react-native';
import { MAP_COVERAGE_BOUNDS } from '@/lib/constants';

const [WEST, SOUTH, EAST, NORTH] = MAP_COVERAGE_BOUNDS.city;

function inTashkentCity(lat: number, lng: number): boolean {
  return lng >= WEST && lng <= EAST && lat >= SOUTH && lat <= NORTH;
}

export function useCurrentLocation() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const requestCurrentLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLoading(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(t('listing.gpsDisabledTitle'), t('listing.gpsDisabledMessage'));
        return null;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          t('listing.gpsDeniedTitle'),
          t('listing.gpsDeniedMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('listing.openSettings'),
              onPress: () => {
                if (Platform.OS === 'ios') {
                  void Linking.openURL('app-settings:');
                } else {
                  void Linking.openSettings();
                }
              },
            },
          ],
        );
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (!inTashkentCity(lat, lng)) {
        Alert.alert(t('listing.gpsOutsideTitle'), t('listing.gpsOutsideMessage'));
        return null;
      }

      return { lat, lng };
    } catch {
      Alert.alert(t('listing.gpsErrorTitle'), t('listing.gpsErrorMessage'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);

  return { requestCurrentLocation, loading };
}
