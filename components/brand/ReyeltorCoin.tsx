import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export type ReyeltorCoinSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero';

export const COIN_SIZE_MAP: Record<ReyeltorCoinSize, number> = {
  xs: 20,
  sm: 28,
  md: 48,
  lg: 64,
  hero: 96,
};

function coinPx(size: ReyeltorCoinSize | number): number {
  return typeof size === 'number' ? size : COIN_SIZE_MAP[size];
}

interface CoinFaceProps {
  size: ReyeltorCoinSize | number;
}

function CoinRim({ id }: { id: string }) {
  return (
    <>
      <Circle cx="50" cy="50" r="49" fill={`url(#${id}-rim-deep)`} />
      <Circle cx="50" cy="50" r="46.5" fill={`url(#${id}-rim)`} stroke={`url(#${id}-rim-edge)`} strokeWidth="0.6" />
      <G stroke={`url(#${id}-reed)`} strokeWidth="0.85" strokeLinecap="round" opacity={0.45}>
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 36;
          const inner = 45;
          const outer = 47.2;
          return (
            <Path
              key={i}
              d={`M ${50 + inner * Math.cos(angle)} ${50 + inner * Math.sin(angle)} L ${50 + outer * Math.cos(angle)} ${50 + outer * Math.sin(angle)}`}
            />
          );
        })}
      </G>
    </>
  );
}

function CoinGradients({ id }: { id: string }) {
  return (
    <Defs>
      <RadialGradient id={`${id}-field`} cx="36%" cy="28%" r="72%">
        <Stop offset="0%" stopColor="#FFF9E8" />
        <Stop offset="38%" stopColor="#F5D565" />
        <Stop offset="72%" stopColor="#C98A1A" />
        <Stop offset="100%" stopColor="#7A4E0C" />
      </RadialGradient>
      <RadialGradient id={`${id}-inner`} cx="50%" cy="42%" r="58%">
        <Stop offset="0%" stopColor="#FFE9A8" />
        <Stop offset="55%" stopColor="#E2AE2F" />
        <Stop offset="100%" stopColor="#9A6412" />
      </RadialGradient>
      <LinearGradient id={`${id}-rim`} x1="8%" y1="8%" x2="92%" y2="92%">
        <Stop offset="0%" stopColor="#FDE68A" />
        <Stop offset="45%" stopColor="#D4920A" />
        <Stop offset="100%" stopColor="#5C3A08" />
      </LinearGradient>
      <LinearGradient id={`${id}-rim-deep`} x1="0%" y1="100%" x2="100%" y2="0%">
        <Stop offset="0%" stopColor="#2A1704" />
        <Stop offset="100%" stopColor="#4A2E08" />
      </LinearGradient>
      <LinearGradient id={`${id}-rim-edge`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF7D6" stopOpacity="0.9" />
        <Stop offset="100%" stopColor="#6B3F07" stopOpacity="0.8" />
      </LinearGradient>
      <LinearGradient id={`${id}-reed`} x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFF2C2" />
        <Stop offset="100%" stopColor="#5A3708" />
      </LinearGradient>
      <LinearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
      <LinearGradient id={`${id}-mark`} x1="30%" y1="20%" x2="70%" y2="90%">
        <Stop offset="0%" stopColor="#1E293B" />
        <Stop offset="100%" stopColor="#0B1220" />
      </LinearGradient>
      <LinearGradient id={`${id}-mark-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
  );
}

/** Obverse — embossed R monogram on brushed gold. */
export function CoinFrontFace({ size }: CoinFaceProps) {
  const px = coinPx(size);
  const id = useId().replace(/:/g, '');

  return (
    <Svg width={px} height={px} viewBox="0 0 100 100" accessibilityLabel="Reyeltor coin front">
      <CoinGradients id={id} />
      <CoinRim id={id} />

      <Circle cx="50" cy="50" r="43.5" fill={`url(#${id}-field)`} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke="#FFEFC2" strokeWidth="0.7" opacity={0.55} />
      <Circle cx="50" cy="50" r="37" fill="none" stroke="#2563EB" strokeWidth="0.55" opacity={0.35} />

      <G opacity={0.28}>
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 16;
          const x = 50 + 34 * Math.cos(angle);
          const y = 50 + 34 * Math.sin(angle);
          return <Circle key={i} cx={x} cy={y} r="0.9" fill="#FFF6D8" />;
        })}
      </G>

      <Circle cx="50" cy="50" r="27" fill={`url(#${id}-inner)`} stroke="#B8861B" strokeWidth="0.5" />

      {/* Emboss shadow */}
      <Path
        d="M36 69 V31 H51.5 C58.5 31 63.5 35.8 63.5 42.2 C63.5 47.2 60.5 51 55.5 52.2 L66 69 H58 L48.5 52.2 H41 V69 H36 Z M41 37.5 V47 H50.5 C53.5 47 55.8 45.2 55.8 42.2 C55.8 39.2 53.5 37.5 50.5 37.5 H41 Z"
        fill="#2A1806"
        opacity={0.55}
        transform="translate(0.8 1.1)"
      />
      {/* Monogram */}
      <Path
        d="M36 69 V31 H51.5 C58.5 31 63.5 35.8 63.5 42.2 C63.5 47.2 60.5 51 55.5 52.2 L66 69 H58 L48.5 52.2 H41 V69 H36 Z M41 37.5 V47 H50.5 C53.5 47 55.8 45.2 55.8 42.2 C55.8 39.2 53.5 37.5 50.5 37.5 H41 Z"
        fill={`url(#${id}-mark)`}
      />
      <Path
        d="M36 69 V31 H51.5 C58.5 31 63.5 35.8 63.5 42.2 C63.5 47.2 60.5 51 55.5 52.2 L66 69 H58 L48.5 52.2 H41 V69 H36 Z M41 37.5 V47 H50.5 C53.5 47 55.8 45.2 55.8 42.2 C55.8 39.2 53.5 37.5 50.5 37.5 H41 Z"
        fill={`url(#${id}-mark-shine)`}
      />

      <Ellipse cx="34" cy="30" rx="16" ry="10" fill={`url(#${id}-shine)`} transform="rotate(-24 34 30)" />
    </Svg>
  );
}

/** Reverse — compass star mint mark. */
export function CoinBackFace({ size }: CoinFaceProps) {
  const px = coinPx(size);
  const id = useId().replace(/:/g, '');

  return (
    <Svg width={px} height={px} viewBox="0 0 100 100" accessibilityLabel="Reyeltor coin back">
      <CoinGradients id={id} />
      <CoinRim id={id} />

      <Circle cx="50" cy="50" r="43.5" fill={`url(#${id}-field)`} />
      <Circle cx="50" cy="50" r="40" fill="none" stroke="#FFEFC2" strokeWidth="0.7" opacity={0.45} />

      <G fill="none" stroke="#B8892B" strokeWidth="0.45" opacity={0.5}>
        <Circle cx="50" cy="50" r="30" />
        <Circle cx="50" cy="50" r="22" />
      </G>

      <Path
        d="M50 24 L54 46 L76 50 L54 54 L50 76 L46 54 L24 50 L46 46 Z"
        fill="#1E293B"
        opacity={0.88}
      />
      <Path
        d="M50 30 L53 46 L69 50 L53 54 L50 70 L47 54 L31 50 L47 46 Z"
        fill="#334155"
        opacity={0.95}
      />
      <Circle cx="50" cy="50" r="5.5" fill="#F8E7B0" stroke="#9A6412" strokeWidth="0.6" />

      <Ellipse cx="34" cy="30" rx="16" ry="10" fill={`url(#${id}-shine)`} transform="rotate(-24 34 30)" opacity={0.7} />
    </Svg>
  );
}

/** Static coin (lists, profile balance). */
export function ReyeltorCoin({ size = 'md' }: { size?: ReyeltorCoinSize | number }) {
  return <CoinFrontFace size={size} />;
}
