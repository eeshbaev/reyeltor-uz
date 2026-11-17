import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/lib/theme';

type BarStyle = 'light' | 'dark' | 'auto';

interface AppSystemBarsProps {
  style?: BarStyle;
  hidden?: boolean;
}

/** Edge-to-edge is built into Expo SDK 54+; only the status bar icons need styling. */
export function AppSystemBars({ style, hidden }: AppSystemBarsProps) {
  const theme = useTheme();
  /** Light icons on dark surfaces; dark icons on light surfaces. */
  const resolvedStyle = style ?? (theme.isDark ? 'light' : 'dark');

  return <StatusBar style={resolvedStyle} hidden={hidden} />;
}
