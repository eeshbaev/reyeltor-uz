import { Platform, type ViewStyle } from 'react-native';
import type { Theme } from '@/lib/theme';

/** Soft elevated shadow for floating map controls and cards. */
export function mapElevatedShadow(theme: Theme): ViewStyle {
  return (
    Platform.select({
      ios: {
        shadowColor: theme.isDark ? '#000000' : '#0F172A',
        shadowOpacity: theme.isDark ? 0.42 : 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
      default: {
        boxShadow: theme.isDark
          ? '0 10px 32px rgba(0,0,0,0.38)'
          : '0 10px 32px rgba(15,23,42,0.1)',
      } as ViewStyle,
    }) ?? {}
  );
}

/** Hairline border that reads well on top of the map. */
export function mapChromeBorder(theme: Theme): ViewStyle {
  return {
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)',
  };
}

export const MAP_CHROME_RADIUS = 20;
export const MAP_CHROME_RADIUS_PILL = 999;
