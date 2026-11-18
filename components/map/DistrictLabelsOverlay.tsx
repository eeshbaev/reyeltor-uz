import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { MapCoverage } from '@/lib/constants';
import { fixedColors } from '@/lib/design/colors';
import { radius } from '@/lib/design/radius';
import {
  BOUNDARY_LABEL_FRAME,
  getBoundaryLabelOpacity,
} from '@/lib/map/boundaryConstants';
import {
  BOUNDARY_LABEL_BADGE_WIDTH,
  getBoundaryLabelContent,
} from '@/lib/map/boundaryLabelContent';
import { getDistrictLabelPoints } from '@/lib/map/districtBoundaries';

interface DistrictLabelsOverlayProps {
  coverage: MapCoverage;
  zoom: number;
  districtDetail?: (name: string) => string | null;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
}

export function DistrictLabelsOverlay({
  coverage,
  zoom,
  districtDetail,
  project,
}: DistrictLabelsOverlayProps) {
  const opacity = getBoundaryLabelOpacity(zoom);
  const labels = useMemo(
    () => getDistrictLabelPoints(coverage, districtDetail ?? (() => null)),
    [coverage, districtDetail],
  );

  if (opacity <= 0.05) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {labels.features.map((feature) => {
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        const pos = project(lng, lat);
        if (!pos) return null;

        const { name, tier, detail, showMarket } = feature.properties as {
          name: string;
          tier: 'city' | 'region';
          detail: string;
          showMarket: number;
        };

        const content = getBoundaryLabelContent(zoom, name, detail, showMarket, tier);
        const frame = BOUNDARY_LABEL_FRAME[tier];

        return (
          <View
            key={`${tier}-${name}`}
            style={[
              styles.badge,
              {
                left: pos.x - BOUNDARY_LABEL_BADGE_WIDTH / 2,
                top: pos.y - (content.showMarket ? 28 : 18),
                opacity,
                borderColor: frame.border,
                backgroundColor: frame.background,
                paddingVertical: content.showMarket ? 10 : 8,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.title, { color: frame.title, fontSize: content.showMarket ? 14 : 13 }]}
            >
              {content.title}
            </AppText>
            {content.subtitle ? (
              <AppText variant="micro" style={[styles.subtitle, { color: frame.subtitle }]}>
                {content.subtitle}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    width: BOUNDARY_LABEL_BADGE_WIDTH,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: fixedColors.slate900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 12,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
