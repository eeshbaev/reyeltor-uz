import { useColorScheme } from 'react-native';
import { colorTokens, type ColorScheme, type ThemeColors } from './design/colors';
import { spacing } from './design/spacing';
import { typography } from './design/typography';
import { motion } from './design/motion';

export { typography, spacing, motion, colorTokens };
export type { ThemeColors, ColorScheme };

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    colors: colorTokens[scheme],
    isDark: scheme === 'dark',
  };
}

/** @deprecated Use useTheme().colors — kept for gradual migration */
export const colors = colorTokens.light;

/** @deprecated Use typography via AppText */
export const fontSize = {
  xs: typography.micro.fontSize,
  sm: typography.caption.fontSize,
  md: typography.body.fontSize,
  lg: typography.h3.fontSize,
  xl: typography.h2.fontSize,
  xxl: typography.h1.fontSize,
} as const;
