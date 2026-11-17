import { StyleSheet } from 'react-native';
import { spacing } from '@/lib/design/spacing';
import { TAB_BAR_CLEARANCE } from '@/lib/navigation/tabBarMetrics';

/** Filter sheet — slides up behind the floating tab bar. */
export const SHEET_BEHIND_TAB_Z_INDEX = 900;

/** Listing detail over filter sheet (still behind tab bar). */
export const SHEET_BEHIND_TAB_Z_INDEX_DETAIL = 910;

/** Bottom sheets that render above the floating tab bar (z-index 1000). */
export const SHEET_Z_INDEX = 1100;

/** Nested sheets over map sheets (still behind the tab bar). */
export const SHEET_BEHIND_TAB_Z_INDEX_NESTED = 950;

/** Bottom offset for sheets that stop above the tab bar (e.g. filter sheet). */
export function sheetBottomInset(safeBottom: number): number {
  return Math.max(safeBottom, spacing.sm) + TAB_BAR_CLEARANCE - spacing.md;
}

/** Scroll padding so content clears the floating tab bar when the sheet runs behind it. */
export function tabBarScrollPadding(safeBottom: number): number {
  return Math.max(safeBottom, spacing.sm) + TAB_BAR_CLEARANCE + spacing.lg;
}

/** Full-screen host for bottom sheets on list/favorites/agent screens. */
export const sheetOverlayLayerStyle = StyleSheet.flatten([
  StyleSheet.absoluteFill,
  { zIndex: 20 },
]);
