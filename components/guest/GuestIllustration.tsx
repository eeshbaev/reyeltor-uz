import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

const SIZE = 180;

/** Guest / auth prompt illustration — map pin + home motif. */
export function GuestIllustration() {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const accent = theme.colors.accent;
  const surface = theme.colors.surfaceElevated;
  const border = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';

  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
      <Defs>
        <LinearGradient id={`${id}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accent} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={accent} stopOpacity="0.04" />
        </LinearGradient>
      </Defs>
      <Circle cx="90" cy="90" r="78" fill={`url(#${id}-glow)`} />
      <Rect x="48" y="72" width="84" height="64" rx="14" fill={surface} stroke={border} strokeWidth="1.5" />
      <Rect x="60" y="84" width="24" height="20" rx="4" fill={theme.colors.accentSurface} />
      <Rect x="96" y="84" width="24" height="20" rx="4" fill={theme.colors.accentSurface} />
      <Path
        d="M90 36c-14 0-25 11-25 25 0 19 25 45 25 45s25-26 25-45c0-14-11-25-25-25zm0 34a9 9 0 110-18 9 9 0 010 18z"
        fill={accent}
      />
    </Svg>
  );
}
