import Svg, { Path } from 'react-native-svg';

interface PenDrawIconProps {
  color: string;
  size?: number;
}

/** Pencil pen with a small drawing stroke. */
export function PenDrawIcon({ color, size = 22 }: PenDrawIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        fill={color}
      />
      <Path
        d="M5 19.5c2.2-1.2 4.5-1 7 0.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
    </Svg>
  );
}
