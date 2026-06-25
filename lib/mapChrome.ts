import { Platform } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { spacing } from '@/lib/design/spacing';

/** Top offset for map floating controls (currency, pen, filter). */
export function mapOverlayTop(insets: EdgeInsets): number {
  const safeTop = Math.max(insets.top, Platform.OS === 'web' ? spacing.sm : 0);
  return safeTop + spacing.md;
}
