import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, spacing, useTheme } from '@/lib/theme';

interface CollapsibleFilterSectionProps {
  title: string;
  summary?: string | null;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleFilterSection({
  title,
  summary,
  children,
  defaultExpanded = false,
}: CollapsibleFilterSectionProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={[
        styles.section,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
      ]}
    >
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>{title}</Text>
          {!expanded && summary ? (
            <Text style={[styles.summary, { color: theme.colors.secondary }]} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.secondary} />
      </Pressable>
      {expanded ? (
        <View style={[styles.body, { borderTopColor: theme.colors.border }]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: spacing.xs },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  summary: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
