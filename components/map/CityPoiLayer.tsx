import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { POI_CATEGORY_COLOR, POI_CATEGORY_ICON } from '@/components/map/neighborhoodMarkerStyles';
import { Text } from '@/components/ui/Text';
import { fixedColors } from '@/lib/design/colors';
import { typeSize } from '@/lib/design/typography';
import { CITY_POI_LABEL_ZOOM } from '@/lib/map/cityPois';
import type { NeighborhoodPoi } from '@/lib/neighborhood/amenities';

/** More specific icons when the data knows the kind of place. */
const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  hospital: 'medkit',
  clinic: 'medkit-outline',
  doctors: 'medical-outline',
  pharmacy: 'bandage-outline',
  kindergarten: 'happy-outline',
  school: 'school',
  college: 'school-outline',
  university: 'library',
  museum: 'easel-outline',
  theatre: 'film-outline',
  library: 'book-outline',
  place_of_worship: 'moon-outline',
  park: 'leaf',
  garden: 'flower-outline',
  stadium: 'football-outline',
  sports_centre: 'barbell-outline',
  zoo: 'paw-outline',
  theme_park: 'happy-outline',
  water_park: 'water-outline',
  mall: 'bag-handle-outline',
  supermarket: 'cart-outline',
  marketplace: 'basket-outline',
  attraction: 'star-outline',
};

interface CityPoiLayerProps {
  pois: NeighborhoodPoi[];
  zoom: number;
  language: string;
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
}

function CityPoiLayerComponent({ pois, zoom, language, getScreenPosition }: CityPoiLayerProps) {
  const showLabels = zoom >= CITY_POI_LABEL_ZOOM;
  return (
    <>
      {pois.map((poi) => {
        const screen = getScreenPosition(poi.lng, poi.lat);
        if (!screen) return null;
        const color = POI_CATEGORY_COLOR[poi.category];
        const icon = (poi.kind && KIND_ICON[poi.kind]) || (POI_CATEGORY_ICON[poi.category] as keyof typeof Ionicons.glyphMap);
        const name = language.startsWith('uz') ? poi.nameUz : poi.name;
        return (
          <View key={poi.id} style={[styles.anchor, { left: screen.x, top: screen.y }]} pointerEvents="none">
            <View style={[styles.dot, { backgroundColor: color }]}>
              <Ionicons name={icon} size={12} color={fixedColors.white} />
            </View>
            {showLabels ? (
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {name.length > 26 ? `${name.slice(0, 25)}…` : name}
              </Text>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

export const CityPoiLayer = memo(CityPoiLayerComponent);

const SIZE = 22;

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -SIZE / 2,
    marginTop: -SIZE / 2,
  },
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: fixedColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
    shadowColor: fixedColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  label: {
    marginLeft: 4,
    maxWidth: 150,
    fontSize: typeSize.micro,
    fontWeight: '600',
    textShadowColor: 'rgba(255,255,255,0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
