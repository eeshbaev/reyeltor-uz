import React from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { elevation } from '@/lib/design/elevation';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

interface ScreenSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function ScreenSection({
  title,
  subtitle,
  children,
  style,
  elevated = true,
}: ScreenSectionProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
        elevated ? elevation.subtle : null,
        style,
      ]}
    >
      <View style={styles.header}>
        <AppText variant="h3" style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export default ScreenSection;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
});
