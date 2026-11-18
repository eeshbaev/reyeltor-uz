import { useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { hapticLight } from '@/lib/haptics';
import { spacing, useTheme } from '@/lib/theme';

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginTop: spacing.md,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : theme.colors.surface,
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
        headerText: { flex: 1, gap: 4 },
        iconWrap: {
          width: 28,
          height: 28,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
        },
        body: {
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          gap: spacing.sm,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.header}
        onPress={() => {
          hapticLight();
          setExpanded((prev) => !prev);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerText}>
          <AppText variant="label" style={{ fontWeight: '600' }}>
            {title}
          </AppText>
          {!expanded && summary ? (
            <AppText variant="caption" color="secondary" numberOfLines={2}>
              {summary}
            </AppText>
          ) : null}
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.secondary} />
        </View>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}
