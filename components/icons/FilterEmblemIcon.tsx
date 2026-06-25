import Svg, { Path } from 'react-native-svg';

interface FilterEmblemIconProps {
  color: string;
  size?: number;
}

/** Classic funnel filter emblem. */
export function FilterEmblemIcon({ color, size = 18 }: FilterEmblemIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 4h18l-7.2 10.2V20h-3.6v-5.8L3 4z"
        fill={color}
      />
    </Svg>
  );
}
