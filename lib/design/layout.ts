import { spacing } from '@/lib/design/spacing';
import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';

export { TAB_BAR_CLEARANCE };

/** Top padding below status bar / display cutout. */
export function screenTopPadding(topInset: number, extra: number = spacing.sm): number {
  return topInset + extra;
}

/** Bottom padding for scroll content above the floating tab bar. */
export function screenBottomPadding(bottomInset: number, extra: number = spacing.md): number {
  return bottomInset + TAB_BAR_CLEARANCE + extra;
}

/** Map listing carousel offset above tab bar. */
export function mapCarouselBottom(bottomInset: number): number {
  return bottomInset + TAB_BAR_CLEARANCE - spacing.lg;
}
