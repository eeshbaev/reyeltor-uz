import { useWindowDimensions, type ViewStyle } from 'react-native';

/**
 * Layout follows the window, not the device (manual L-06 / AD-01): phones, tablets,
 * foldables, split screen and resizable windows all use the same three classes.
 */
export type WindowClass = 'compact' | 'medium' | 'expanded';

export const WINDOW_MEDIUM = 600;
export const WINDOW_EXPANDED = 840;
/** Readable column for text and forms on wide windows (manual L-07). */
export const CONTENT_MAX_WIDTH = 640;
/** Side panel width for listing details on expanded windows. */
export const SIDE_PANEL_WIDTH = 420;

export function windowClassFor(width: number): WindowClass {
  if (width >= WINDOW_EXPANDED) return 'expanded';
  if (width >= WINDOW_MEDIUM) return 'medium';
  return 'compact';
}

export function useWindowClass(): WindowClass {
  const { width } = useWindowDimensions();
  return windowClassFor(width);
}

/** Centres content in a readable column on medium and expanded windows; no-op on phones. */
export function useContentColumn(): ViewStyle | null {
  const windowClass = useWindowClass();
  return windowClass === 'compact' ? null : { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' };
}
