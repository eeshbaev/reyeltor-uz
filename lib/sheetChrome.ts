import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { spacing } from '@/lib/design/spacing';
import { StyleSheet } from 'react-native';

/** Filter sheet — slides up behind the floating tab bar. */
export const SHEET_BEHIND_TAB_Z_INDEX = 900;

/** Listing detail over filter sheet (still behind tab bar). */
export const SHEET_BEHIND_TAB_Z_INDEX_DETAIL = 910;

/** Bottom sheets that render above the floating tab bar (z-index 1000). */
export const SHEET_Z_INDEX = 1100;

/** Nested sheets over map sheets (still behind the tab bar). */
export const SHEET_BEHIND_TAB_Z_INDEX_NESTED = 950;

/** Clearance above the floating tab bar for sheet footers and content. */
export function sheetBottomInset(safeBottom: number): number {
  return Math.max(safeBottom, spacing.sm) + TAB_BAR_CLEARANCE - spacing.md;
}

/** Full-screen host for bottom sheets on list/favorites/agent screens. */
export const sheetOverlayLayerStyle = StyleSheet.flatten([
  StyleSheet.absoluteFillObject,
  { zIndex: 20 },
]);
