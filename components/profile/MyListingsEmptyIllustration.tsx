import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/theme';

const SIZE = 180;

export function MyListingsEmptyIllustration() {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const accent = theme.colors.accent;
  const accentSoft = theme.colors.accentSurface;
  const surface = theme.colors.surfaceElevated;
  const border = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';

  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
      <Defs>
        <LinearGradient id={`${id}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accent} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={accent} stopOpacity="0.04" />
        </LinearGradient>
        <LinearGradient id={`${id}-roof`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accent} />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </LinearGradient>
      </Defs>

      <Circle cx="90" cy="90" r="78" fill={`url(#${id}-glow)`} />
      <Circle cx="48" cy="52" r="20" fill={accentSoft} opacity={0.5} />
      <Circle cx="138" cy="128" r="16" fill={accentSoft} opacity={0.35} />

      <G transform="translate(34, 42)">
        <Rect x="0" y="48" width="112" height="72" rx="12" fill={surface} stroke={border} strokeWidth="1.5" />
        <Path d="M8 48 L56 12 L104 48 Z" fill={`url(#${id}-roof)`} />
        <Rect x="20" y="68" width="28" height="28" rx="6" fill={accentSoft} opacity={0.8} />
        <Rect x="64" y="68" width="28" height="28" rx="6" fill={accentSoft} opacity={0.55} />
        <Rect x="44" y="96" width="24" height="24" rx="4" fill={theme.colors.borderStrong} opacity={0.25} />

        <G transform="translate(92, -6)">
          <Circle cx="22" cy="22" r="24" fill={surface} stroke={border} strokeWidth="1.5" />
          <Path
            d="M22 14v16M14 22h16"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </G>
      </G>
    </Svg>
  );
}
