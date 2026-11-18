import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { screenBottomPadding, screenTopPadding } from '@/lib/design/layout';
import { spacing } from '@/lib/design/spacing';
import { useContentColumn } from '@/lib/design/windowClass';

interface ScreenScrollProps extends ScrollViewProps {
  reserveTabBar?: boolean;
  /** When true, pad scroll content below the status bar / cutout (screens without a header bar). */
  reserveTop?: boolean;
  extraBottom?: number;
  extraTop?: number;
}

/** ScrollView with consistent horizontal padding and tab-bar clearance. */
export function ScreenScroll({
  reserveTabBar = true,
  reserveTop = false,
  extraBottom = spacing.md,
  extraTop = spacing.sm,
  contentContainerStyle,
  children,
  ...props
}: ScreenScrollProps) {
  const insets = useSafeAreaInsets();
  const column = useContentColumn();
  const bottom = reserveTabBar ? screenBottomPadding(insets.bottom, extraBottom) : insets.bottom + extraBottom;
  const top = reserveTop ? screenTopPadding(insets.top, extraTop) : 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ paddingTop: top, paddingBottom: bottom }, column, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
