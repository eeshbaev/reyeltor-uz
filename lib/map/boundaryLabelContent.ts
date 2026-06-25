import type { BoundaryTier } from '@/lib/map/districtBoundaries';
import { BOUNDARY_MARKET_LABEL_MIN_ZOOM } from '@/lib/map/boundaryConstants';

export interface BoundaryLabelContent {
  title: string;
  subtitle: string | null;
  tier: BoundaryTier;
  showMarket: boolean;
}

export function getBoundaryLabelContent(
  zoom: number,
  name: string,
  detail: string,
  showMarketFlag: number,
  tier: BoundaryTier,
): BoundaryLabelContent {
  const showMarket = zoom >= BOUNDARY_MARKET_LABEL_MIN_ZOOM && showMarketFlag === 1;
  if (!showMarket) {
    return { title: name, subtitle: null, tier, showMarket: false };
  }

  const lines = detail.split('\n');
  return {
    title: lines[0] ?? name,
    subtitle: lines.length > 1 ? lines.slice(1).join('\n') : null,
    tier,
    showMarket: true,
  };
}

/** Badge width used to center labels on their anchor point. */
export const BOUNDARY_LABEL_BADGE_WIDTH = 188;

export function boundaryLabelBadgeOffset(width = BOUNDARY_LABEL_BADGE_WIDTH, height = 44): {
  left: number;
  top: number;
} {
  return { left: -width / 2, top: -height / 2 };
}
