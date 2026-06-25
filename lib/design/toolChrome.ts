import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { spacing } from '@/lib/design/spacing';
import { typography } from '@/lib/design/typography';
import type { Theme } from '@/lib/theme';

export const TOOL_CARD_RADIUS = 20;
export const TOOL_INPUT_RADIUS = 14;

export function toolScreenBackground(theme: Theme): string {
  return theme.isDark ? theme.colors.background : '#F4F6FA';
}

export function toolElevation(theme: Theme): ViewStyle {
  if (theme.isDark) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    };
  }
  return {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  };
}

export function toolSoftElevation(theme: Theme): ViewStyle {
  if (theme.isDark) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    };
  }
  return {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  };
}

export function toolCardStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: TOOL_CARD_RADIUS,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...toolElevation(theme),
  };
}

export function toolHighlightCardStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: TOOL_CARD_RADIUS,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...toolElevation(theme),
  };
}

export function toolMetricCardStyle(theme: Theme): ViewStyle {
  return {
    flex: 1,
    backgroundColor: theme.isDark ? theme.colors.surface : '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...toolSoftElevation(theme),
  };
}

export function toolFieldLabelStyle(theme: Theme): TextStyle {
  return {
    ...typography.label,
    color: theme.colors.secondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '600',
  };
}

export function toolInputStyle(theme: Theme): TextStyle {
  return {
    backgroundColor: theme.isDark ? theme.colors.surface : '#F1F5F9',
    borderRadius: TOOL_INPUT_RADIUS,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.border : 'rgba(15, 23, 42, 0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : spacing.sm,
    fontSize: typography.body.fontSize,
    color: theme.colors.primary,
    minHeight: 48,
  };
}

export function toolPillStyle(theme: Theme, active: boolean): ViewStyle {
  return {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? theme.colors.accent : theme.colors.border,
    backgroundColor: active ? theme.colors.accent : theme.isDark ? theme.colors.surface : '#F1F5F9',
    ...(active ? toolSoftElevation(theme) : {}),
  };
}

export function toolSelectorStyle(theme: Theme): ViewStyle {
  return {
    flex: 1,
    backgroundColor: theme.isDark ? theme.colors.surface : '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...toolSoftElevation(theme),
  };
}

export function toolPickerStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: TOOL_CARD_RADIUS,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...toolSoftElevation(theme),
  };
}

export function toolReadOnlyStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.isDark ? theme.colors.surface : '#F1F5F9',
    borderRadius: TOOL_INPUT_RADIUS,
    borderWidth: 1,
    borderColor: theme.isDark ? theme.colors.border : 'rgba(15, 23, 42, 0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : spacing.sm,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
}
