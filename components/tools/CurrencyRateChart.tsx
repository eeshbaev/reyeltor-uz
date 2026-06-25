import { useMemo } from 'react';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import type { CbuRatePoint } from '@/lib/exchange/cbuRateHistory';
import { formatRateDateLabel } from '@/lib/exchange/cbuRateHistory';
import { spacing } from '@/lib/design/spacing';

interface CurrencyRateChartProps {
  data: CbuRatePoint[];
  accentColor: string;
  gridColor: string;
  labelColor: string;
  height?: number;
}

const PADDING = { top: 16, right: 12, bottom: 30, left: 54 };

export function CurrencyRateChart({
  data,
  accentColor,
  gridColor,
  labelColor,
  height = 220,
}: CurrencyRateChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(280, screenWidth - spacing.md * 2);

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const rates = data.map((point) => point.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    const range = maxRate - minRate || 1;
    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;

    const coordinates = data.map((point, index) => {
      const x = PADDING.left + (index / (data.length - 1)) * plotW;
      const y = PADDING.top + plotH - ((point.rate - minRate) / range) * plotH;
      return { x, y, point };
    });

    const path = coordinates
      .map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
      .join(' ');

    const areaPath = `${path} L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${(PADDING.top + plotH).toFixed(2)} L ${coordinates[0].x.toFixed(2)} ${(PADDING.top + plotH).toFixed(2)} Z`;

    const labelIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1];

    return {
      minRate,
      maxRate,
      path,
      areaPath,
      coordinates,
      labelIndexes,
      plotH,
    };
  }, [data, width, height]);

  if (!chart) {
    return (
      <View style={[styles.empty, { height }]}>
        <AppText variant="caption" color="secondary">
          —
        </AppText>
      </View>
    );
  }

  const formatRate = (value: number) =>
    new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Math.round(value));

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        <Line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + chart.plotH}
          stroke={gridColor}
          strokeWidth={1}
        />
        <Line
          x1={PADDING.left}
          y1={PADDING.top + chart.plotH}
          x2={width - PADDING.right}
          y2={PADDING.top + chart.plotH}
          stroke={gridColor}
          strokeWidth={1}
        />

        <SvgText x={8} y={PADDING.top + 4} fill={labelColor} fontSize={10}>
          {formatRate(chart.maxRate)}
        </SvgText>
        <SvgText x={8} y={PADDING.top + chart.plotH} fill={labelColor} fontSize={10}>
          {formatRate(chart.minRate)}
        </SvgText>

        <Path d={chart.areaPath} fill={accentColor} opacity={0.12} />
        <Path d={chart.path} stroke={accentColor} strokeWidth={2.5} fill="none" />

        {chart.coordinates.map((coord) => (
          <Circle key={coord.point.date} cx={coord.x} cy={coord.y} r={3} fill={accentColor} />
        ))}

        {chart.labelIndexes.map((index) => {
          const coord = chart.coordinates[index];
          return (
            <SvgText
              key={coord.point.date}
              x={coord.x}
              y={height - 8}
              fill={labelColor}
              fontSize={10}
              textAnchor={index === 0 ? 'start' : index === chart.labelIndexes.length - 1 ? 'end' : 'middle'}
            >
              {formatRateDateLabel(coord.point.date)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center' },
});
