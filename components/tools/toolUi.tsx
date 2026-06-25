import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import {
  TOOL_CARD_RADIUS,
  toolCardStyle,
  toolFieldLabelStyle,
  toolHighlightCardStyle,
  toolMetricCardStyle,
  toolPillStyle,
  toolReadOnlyStyle,
  toolSoftElevation,
} from '@/lib/design/toolChrome';
import { useTheme } from '@/lib/theme';

export const toolScreenStyles = StyleSheet.create({
  container: { flex: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { gap: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { marginBottom: spacing.sm, letterSpacing: -0.3 },
  resultsNote: { marginBottom: spacing.sm, letterSpacing: 0.2 },
  tableHeader: { flexDirection: 'row', gap: 4, marginBottom: spacing.xs, paddingBottom: spacing.xs },
  tableRow: { flexDirection: 'row', gap: 4, paddingVertical: 6 },
  resultLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  itemLeft: { flex: 1, gap: 4 },
  showAll: { marginTop: spacing.sm, alignItems: 'center' },
  headline: { marginBottom: spacing.sm, letterSpacing: -0.5 },
  headlineLabel: { marginBottom: spacing.xs, letterSpacing: 0.4, textTransform: 'uppercase' },
  totalLabel: { marginTop: spacing.sm },
  disclaimer: { marginTop: spacing.sm, lineHeight: 18 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metricGridItem: { width: '47%', flexGrow: 1 },
  colYear: { width: 36 },
  colPeriod: { flex: 1.1 },
  col: { flex: 1, textAlign: 'right' as const },
  selectors: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  selector: { flex: 1, borderRadius: 16, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  picker: { borderRadius: 16, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  pickerItem: { padding: spacing.md },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loading: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 180 },
  refreshBtn: { alignSelf: 'center' },
  propertySummary: { gap: spacing.sm },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warning: { marginBottom: spacing.md, lineHeight: 18 },
  scenarioBlock: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  compareRow: { flexDirection: 'row', paddingVertical: spacing.sm },
  metricCol: { flex: 1.2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  earlyResults: { gap: spacing.xs },
  scheduleRow: { flexDirection: 'row', paddingVertical: 6, gap: 4 },
  colMonth: { width: 36 },
  percentReadOnly: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readOnlyInput: { justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  note: { marginTop: spacing.xs },
});

export function ToolCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[toolCardStyle(theme), style]}>{children}</View>;
}

export function ToolHighlightCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[toolHighlightCardStyle(theme), style]}>
      <View
        style={[
          styles.accentRail,
          { backgroundColor: theme.colors.accent },
        ]}
      />
      <View style={styles.highlightBody}>{children}</View>
    </View>
  );
}

export function ToolField({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={toolScreenStyles.field}>
      <Text style={toolFieldLabelStyle(theme)}>{label}</Text>
      {children}
    </View>
  );
}

export function ToolPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={toolPillStyle(theme, active)}>
      <AppText variant="label" color={active ? 'onAccent' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ToolMetricCard({
  label,
  value,
  accent,
  danger,
  success,
  style,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
  success?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View style={[toolMetricCardStyle(theme), style]}>
      <Text style={toolFieldLabelStyle(theme)}>{label}</Text>
      <AppText variant="h3" color={danger ? 'danger' : success ? 'success' : accent ? 'accent' : 'primary'}>
        {value}
      </AppText>
    </View>
  );
}

export function ToolSummaryBox({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={toolMetricCardStyle(theme)}>
      <Text style={toolFieldLabelStyle(theme)}>{label}</Text>
      <AppText variant="h3">{value}</AppText>
    </View>
  );
}

export function ToolResultLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={toolScreenStyles.resultLine}>
      <AppText variant="body" color="secondary">
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

export function ToolBanner({
  children,
  backgroundColor,
  textColor,
}: {
  children: React.ReactNode;
  backgroundColor: string;
  textColor: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.banner,
        toolSoftBanner(theme),
        { backgroundColor, borderColor: theme.colors.border },
      ]}
    >
      <AppText variant="h3" style={{ color: textColor }}>
        {children}
      </AppText>
    </View>
  );
}

export function ToolReadOnlyBox({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <View style={toolReadOnlyStyle(theme)}>{children}</View>;
}

function toolSoftBanner(theme: ReturnType<typeof useTheme>): ViewStyle {
  return {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  };
}

const styles = StyleSheet.create({
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: TOOL_CARD_RADIUS,
    borderBottomLeftRadius: TOOL_CARD_RADIUS,
  },
  highlightBody: { gap: spacing.sm, padding: spacing.lg },
  banner: {},
});
