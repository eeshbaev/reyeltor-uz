import { useMemo } from 'react';
import {
  BOUNDARY_LABEL_FRAME,
  getBoundaryLabelOpacity,
} from '@/lib/map/boundaryConstants';
import {
  BOUNDARY_LABEL_BADGE_WIDTH,
  getBoundaryLabelContent,
} from '@/lib/map/boundaryLabelContent';
import { getDistrictLabelPoints } from '@/lib/map/districtBoundaries';
import type { MapCoverage } from '@/lib/constants';

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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden',
      }}
    >
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
          <div
            key={`${tier}-${name}`}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              opacity,
              width: BOUNDARY_LABEL_BADGE_WIDTH,
              boxSizing: 'border-box',
              padding: content.showMarket ? '10px 12px' : '8px 12px',
              borderRadius: 12,
              border: `1.5px solid ${frame.border}`,
              background: frame.background,
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.14)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                color: frame.title,
                fontSize: content.showMarket ? 14 : 13,
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: -0.2,
              }}
            >
              {content.title}
            </div>
            {content.subtitle ? (
              <div
                style={{
                  marginTop: 4,
                  color: frame.subtitle,
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.35,
                }}
              >
                {content.subtitle}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
