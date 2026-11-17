import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

interface SafeScreenProps {
  children: ReactNode;
  /** Safe-area edges to respect. Default: top + horizontal (tab screens add bottom via scroll padding). */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Full-screen container that respects notch, punch-hole, and status bar insets. */
export function SafeScreen({ children, edges = ['top', 'left', 'right'], style }: SafeScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
