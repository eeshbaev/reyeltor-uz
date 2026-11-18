import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import Svg, { Path, Rect } from 'react-native-svg';
import { fixedColors } from '@/lib/design/colors';

interface QrCodeProps {
  value: string;
  size: number;
  color?: string;
  background?: string;
}

/** Offline QR code rendered as a single SVG path (no network, no images). */
export function QrCode({ value, size, color = fixedColors.slate900, background = fixedColors.white }: QrCodeProps) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  const quiet = 2;
  const box = count + quiet * 2;

  return (
    <Svg width={size} height={size} viewBox={`${-quiet} ${-quiet} ${box} ${box}`}>
      <Rect x={-quiet} y={-quiet} width={box} height={box} fill={background} />
      <Path d={path} fill={color} />
    </Svg>
  );
}
