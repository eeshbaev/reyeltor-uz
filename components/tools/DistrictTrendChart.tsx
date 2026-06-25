import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { formatTrendDateLabel, type DistrictTrendPoint } from '@/lib/market/districtPriceHistory';

interface DistrictTrendChartProps {
  data: DistrictTrendPoint[];
  rentColor: string;
  saleColor: string;
  gridColor: string;
  labelColor: string;
  formatRent: (value: number) => string;
  formatSale: (value: number) => string;
  rentLabel: string;
  saleLabel: string;
  height?: number;
}

const PADDING = { top: 16, right: 48, bottom: 30, left: 48 };

export function DistrictTrendChart({
  data,
  rentColor,
  saleColor,
  gridColor,
  labelColor,
  formatRent,
  formatSale,
  rentLabel,
  saleLabel,
  height = 220,
}: DistrictTrendChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(280, screenWidth - spacing.md * 2);

  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const rents = data.map((point) => point.rent);
    const sales = data.map((point) => point.sale);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);
    const minSale = Math.min(...sales);
    const maxSale = Math.max(...sales);
    const rentRange = maxRent - minRent || 1;
    const saleRange = maxSale - minSale || 1;
    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;

    const rentCoords = data.map((point, index) => {
      const x = PADDING.left + (index / (data.length - 1)) * plotW;
      const y = PADDING.top + plotH - ((point.rent - minRent) / rentRange) * plotH;
      return { x, y, point };
    });

    const saleCoords = data.map((point, index) => {
      const x = PADDING.left + (index / (data.length - 1)) * plotW;
      const y = PADDING.top + plotH - ((point.sale - minSale) / saleRange) * plotH;
      return { x, y, point };
    });

    const toPath = (coords: { x: number; y: number }[]) =>
      coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`).join(' ');

    const labelIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1];

    return {
      minRent,
      maxRent,
      minSale,
      maxSale,
      rentPath: toPath(rentCoords),
      salePath: toPath(saleCoords),
      rentCoords,
      saleCoords,
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

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: rentColor }]} />
          <AppText variant="caption" color="secondary">
            {rentLabel}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: saleColor }]} />
          <AppText variant="caption" color="secondary">
            {saleLabel}
          </AppText>
        </View>
      </View>

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
          x1={width - PADDING.right}
          y1={PADDING.top}
          x2={width - PADDING.right}
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

        <SvgText x={4} y={PADDING.top + 4} fill={rentColor} fontSize={9}>
          {formatRent(chart.maxRent)}
        </SvgText>
        <SvgText x={4} y={PADDING.top + chart.plotH} fill={rentColor} fontSize={9}>
          {formatRent(chart.minRent)}
        </SvgText>
        <SvgText x={width - 4} y={PADDING.top + 4} fill={saleColor} fontSize={9} textAnchor="end">
          {formatSale(chart.maxSale)}
        </SvgText>
        <SvgText x={width - 4} y={PADDING.top + chart.plotH} fill={saleColor} fontSize={9} textAnchor="end">
          {formatSale(chart.minSale)}
        </SvgText>

        <Path d={chart.rentPath} stroke={rentColor} strokeWidth={2.5} fill="none" />
        <Path d={chart.salePath} stroke={saleColor} strokeWidth={2.5} fill="none" />

        {chart.rentCoords.map((coord) => (
          <Circle key={`rent-${coord.point.date}`} cx={coord.x} cy={coord.y} r={2.5} fill={rentColor} />
        ))}
        {chart.saleCoords.map((coord) => (
          <Circle key={`sale-${coord.point.date}`} cx={coord.x} cy={coord.y} r={2.5} fill={saleColor} />
        ))}

        {chart.labelIndexes.map((index) => {
          const coord = chart.rentCoords[index];
          return (
            <SvgText
              key={coord.point.date}
              x={coord.x}
              y={height - 8}
              fill={labelColor}
              fontSize={10}
              textAnchor={index === 0 ? 'start' : index === chart.labelIndexes.length - 1 ? 'end' : 'middle'}
            >
              {formatTrendDateLabel(coord.point.date)}
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
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
