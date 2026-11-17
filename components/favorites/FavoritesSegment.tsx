import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export type FavoritesTab = 'listings' | 'searches';

interface FavoritesSegmentProps {
  tab: FavoritesTab;
  listingsLabel: string;
  searchesLabel: string;
  listingsCount: number;
  searchesCount: number;
  /** Unseen matches across all saved searches. */
  searchesBadge?: number;
  onChange: (tab: FavoritesTab) => void;
}

export function FavoritesSegment({
  tab,
  listingsLabel,
  searchesLabel,
  listingsCount,
  searchesCount,
  searchesBadge = 0,
  onChange,
}: FavoritesSegmentProps) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SegmentButton
        label={listingsLabel}
        count={listingsCount}
        selected={tab === 'listings'}
        onPress={() => onChange('listings')}
      />
      <SegmentButton
        label={searchesLabel}
        count={searchesCount}
        badge={searchesBadge}
        selected={tab === 'searches'}
        onPress={() => onChange('searches')}
      />
    </View>
  );
}

function SegmentButton({
  label,
  count,
  badge = 0,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  badge?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const highlight = badge > 0;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
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
      <View
        style={[
          styles.count,
          {
            backgroundColor: highlight
              ? theme.colors.accent
              : selected
                ? theme.colors.accentSurface
                : theme.colors.background,
          },
        ]}
      >
        <AppText
          variant="micro"
          color={highlight ? 'onAccent' : selected ? 'accent' : 'tertiary'}
          style={styles.countText}
        >
          {highlight ? `+${badge > 99 ? '99' : badge}` : count}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, gap: 4 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
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
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontWeight: '700' },
});
