import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { AmbientPoiCallout } from '@/components/map/AmbientPoiCallout';
import {
  LANDMARK_KIND_COLOR,
  LANDMARK_KIND_ICON,
  LANDMARK_MARKER_OPACITY,
  LANDMARK_MARKER_SIZE,
  METRO_MARKER_COLOR,
  METRO_MARKER_SIZE,
} from '@/components/map/landmarkMarkerStyles';
import { fixedColors } from '@/lib/design/colors';
import { landmarkDisplayName, type MapLandmark } from '@/lib/map/tashkentMapLandmarks';
import { POI_AMBIENT_TAP_MIN_ZOOM } from '@/lib/neighborhood/poiMapConstants';

export type AmbientSelection = { id: string } | null;

const MARKER_HIT_SIZE = 44;

interface AmbientMapMarkersLayerProps {
  landmarks: MapLandmark[];
  zoom: number;
  selected: AmbientSelection;
  onSelect: (id: string) => void;
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
  interactive?: boolean;
}

export function AmbientMapMarkersLayer({
  landmarks,
  zoom,
  selected,
  onSelect,
  getScreenPosition,
  interactive = true,
}: AmbientMapMarkersLayerProps) {
  const { t, i18n } = useTranslation();
  const tappable = interactive && zoom >= POI_AMBIENT_TAP_MIN_ZOOM;
  const hitHalf = MARKER_HIT_SIZE / 2;

  if (landmarks.length === 0) return null;

  return (
    <>
      {landmarks.map((landmark) => {
        const screen = getScreenPosition(landmark.lng, landmark.lat);
        if (!screen) return null;

        const isMetro = landmark.kind === 'metro';
        const markerSize = isMetro ? METRO_MARKER_SIZE : LANDMARK_MARKER_SIZE;
        const isSelected = selected?.id === landmark.id;
        const title = landmarkDisplayName(landmark, i18n.language);
        const color = isMetro ? METRO_MARKER_COLOR : LANDMARK_KIND_COLOR[landmark.kind];
        const icon = LANDMARK_KIND_ICON[landmark.kind] as keyof typeof Ionicons.glyphMap;
        const subtitleKey =
          landmark.kind === 'metro'
            ? 'listing.neighborhood.transport'
            : `map.landmark.${landmark.kind}`;

        return (
          <Pressable
            key={landmark.id}
            style={[
              styles.hitTarget,
              isSelected && styles.selectedAnchor,
              { left: screen.x - hitHalf, top: screen.y - hitHalf },
            ]}
            hitSlop={8}
            disabled={!tappable}
            onPress={() => onSelect(landmark.id)}
          >
            {isSelected ? (
              <View
                style={[styles.calloutSlot, { bottom: hitHalf + markerSize / 2 + 6 }]}
                pointerEvents="none"
              >
                <AmbientPoiCallout title={title} subtitle={t(subtitleKey)} accentColor={color} />
              </View>
            ) : null}
            <View
              style={[
                isMetro ? styles.metroDot : styles.landmarkDot,
                isSelected && styles.selectedDot,
                {
                  width: markerSize,
                  height: markerSize,
                  borderRadius: markerSize / 2,
                  backgroundColor: isMetro ? 'rgba(255,255,255,0.92)' : color,
                  borderColor: isMetro ? color : 'rgba(255,255,255,0.65)',
                  opacity: isSelected || isMetro ? 1 : LANDMARK_MARKER_OPACITY,
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={isMetro ? 8 : 7}
                color={isMetro ? color : 'rgba(255,255,255,0.92)'}
              />
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    position: 'absolute',
    width: MARKER_HIT_SIZE,
    height: MARKER_HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  selectedAnchor: {
    zIndex: 20,
  },
  calloutSlot: {
    position: 'absolute',
    left: -(160 - MARKER_HIT_SIZE) / 2,
    width: 160,
    alignItems: 'center',
  },
  metroDot: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landmarkDot: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    borderWidth: 2,
    borderColor: fixedColors.white,
    shadowColor: fixedColors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
});
