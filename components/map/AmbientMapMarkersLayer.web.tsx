import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { AmbientSelection } from './AmbientMapMarkersLayer';
import {
  LANDMARK_KIND_COLOR,
  LANDMARK_KIND_ICON,
  LANDMARK_MARKER_OPACITY,
  LANDMARK_MARKER_SIZE,
  METRO_MARKER_COLOR,
  METRO_MARKER_SIZE,
} from '@/components/map/landmarkMarkerStyles';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import { landmarkDisplayName, type MapLandmark } from '@/lib/map/tashkentMapLandmarks';
import { POI_AMBIENT_TAP_MIN_ZOOM } from '@/lib/neighborhood/poiMapConstants';

const MARKER_HIT_SIZE = 44;

interface AmbientMapMarkersLayerProps {
  landmarks: MapLandmark[];
  zoom: number;
  selected: AmbientSelection;
  onSelect: (id: string) => void;
  getScreenPosition: (lng: number, lat: number) => { x: number; y: number } | null;
  interactive?: boolean;
}

function Callout({
  title,
  subtitle,
  accentColor,
}: {
  title: string;
  subtitle?: string;
  accentColor: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 160 }}>
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.96)',
          borderRadius: radius.sm,
          border: `1px solid ${accentColor}33`,
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.14)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, color: fixedColors.slate900 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 2, fontSize: 10, lineHeight: 1.2, color: fixedColors.slate500 }}>{subtitle}</div>
        ) : null}
      </div>
      <div style={{ width: 2, height: 5, borderRadius: radius.pill, backgroundColor: accentColor, opacity: 0.45 }} />
    </div>
  );
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
          <div
            key={landmark.id}
            style={{
              position: 'absolute',
              left: screen.x - hitHalf,
              top: screen.y - hitHalf,
              width: MARKER_HIT_SIZE,
              height: MARKER_HIT_SIZE,
              zIndex: isSelected ? 20 : isMetro ? 2 : 1,
              pointerEvents: tappable ? 'auto' : 'none',
              cursor: tappable ? 'pointer' : 'default',
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (tappable) onSelect(landmark.id);
            }}
          >
            {isSelected ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: hitHalf + markerSize / 2 + 6,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <Callout title={title} subtitle={t(subtitleKey)} accentColor={color} />
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: markerSize,
                height: markerSize,
                borderRadius: markerSize / 2,
                border: isSelected
                  ? '2px solid #ffffff'
                  : isMetro
                    ? `2px solid ${color}`
                    : '1.5px solid rgba(255,255,255,0.65)',
                backgroundColor: isMetro ? 'rgba(255,255,255,0.92)' : color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSelected || isMetro ? 1 : LANDMARK_MARKER_OPACITY,
                boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.22)' : undefined,
              }}
            >
              <Ionicons
                name={icon}
                size={isMetro ? 8 : 7}
                color={isMetro ? color : 'rgba(255,255,255,0.92)'}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

export type { AmbientSelection };
