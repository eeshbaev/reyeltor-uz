import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export type MyListingsTab = 'active' | 'archived';

interface MyListingsSegmentProps {
  tab: MyListingsTab;
  activeCount: number;
  archivedCount: number;
  activeLabel: string;
  archivedLabel: string;
  onChange: (tab: MyListingsTab) => void;
}

export function MyListingsSegment({
  tab,
  activeCount,
  archivedCount,
  activeLabel,
  archivedLabel,
  onChange,
}: MyListingsSegmentProps) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SegmentButton
        label={activeLabel}
        count={activeCount}
        selected={tab === 'active'}
        onPress={() => onChange('active')}
      />
      <SegmentButton
        label={archivedLabel}
        count={archivedCount}
        selected={tab === 'archived'}
        onPress={() => onChange('archived')}
      />
    </View>
  );
}

function SegmentButton({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        selected && { backgroundColor: theme.colors.surfaceElevated, shadowColor: theme.colors.primary },
        selected && styles.buttonSelected,
      ]}
    >
      <AppText variant="label" color={selected ? 'primary' : 'secondary'}>
        {label}
      </AppText>
      <View style={[styles.count, { backgroundColor: selected ? theme.colors.accentSurface : theme.colors.background }]}>
        <AppText variant="micro" color={selected ? 'accent' : 'tertiary'} style={styles.countText}>
          {count}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  buttonSelected: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontWeight: '700',
  },
});
