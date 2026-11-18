import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { fixedColors } from '@/lib/design/colors';
import { useTheme } from '@/lib/theme';

const SIZE = 200;

export function FavoritesEmptyIllustration() {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const accent = theme.colors.accent;
  const accentSoft = theme.colors.accentSurface;
  const surface = theme.colors.surfaceElevated;
  const border = theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const heart = theme.colors.danger;

  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
      <Defs>
        <LinearGradient id={`${id}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <Stop offset="100%" stopColor={accent} stopOpacity="0.04" />
        </LinearGradient>
        <LinearGradient id={`${id}-card`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={surface} />
          <Stop offset="100%" stopColor={theme.isDark ? fixedColors.ink850 : fixedColors.snow} />
        </LinearGradient>
        <LinearGradient id={`${id}-heart`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={fixedColors.redSoft} />
          <Stop offset="100%" stopColor={heart} />
        </LinearGradient>
      </Defs>

      <Circle cx="100" cy="100" r="88" fill={`url(#${id}-glow)`} />
      <Circle cx="62" cy="58" r="28" fill={accentSoft} opacity={0.55} />
      <Circle cx="148" cy="142" r="22" fill={accentSoft} opacity={0.4} />

      <G transform="translate(38, 48)">
        <Rect x="0" y="0" width="124" height="96" rx="16" fill={`url(#${id}-card)`} stroke={border} strokeWidth="1.5" />
        <Rect x="12" y="12" width="100" height="52" rx="10" fill={accentSoft} opacity={0.65} />
        <Rect x="12" y="72" width="52" height="8" rx="4" fill={theme.colors.borderStrong} opacity={0.35} />
        <Rect x="12" y="84" width="36" height="6" rx="3" fill={theme.colors.borderStrong} opacity={0.22} />

        <G transform="translate(88, -10)">
          <Circle cx="24" cy="24" r="26" fill={surface} stroke={border} strokeWidth="1.5" />
          <Circle cx="24" cy="24" r="22" fill={`url(#${id}-heart)`} opacity={0.12} />
          <Path
            d="M24 36c-8.5-6.2-14-11.4-14-17.2C10 14.8 13.6 12 17.6 12c2.4 0 4.6 1.2 6.4 3.1C25.8 13.2 28 12 30.4 12 34.4 12 38 14.8 38 18.8 38 24.6 32.5 29.8 24 36z"
            fill={`url(#${id}-heart)`}
          />
        </G>
      </G>

      <G transform="translate(28, 132)">
        <Ellipse cx="18" cy="18" rx="18" ry="18" fill={accent} opacity={0.14} />
        <Path
          d="M18 8c-5.5 0-10 4.5-10 10 0 7.5 10 14 10 14s10-6.5 10-14c0-5.5-4.5-10-10-10zm0 13.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
          fill={accent}
        />
      </G>
    </Svg>
  );
}
