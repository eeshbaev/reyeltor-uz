import { SystemBars } from 'react-native-edge-to-edge';
import { useTheme } from '@/lib/theme';

type BarStyle = 'light' | 'dark' | 'auto';

interface AppSystemBarsProps {
  style?: BarStyle;
  hidden?: boolean;
}

export function AppSystemBars({ style, hidden }: AppSystemBarsProps) {
  const theme = useTheme();
  /** Light icons on dark surfaces; dark icons on light surfaces (edge-to-edge). */
  const resolvedStyle = style ?? (theme.isDark ? 'light' : 'dark');

  return <SystemBars style={resolvedStyle} hidden={hidden} />;
}
