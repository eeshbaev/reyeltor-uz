import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { typeSize } from '@/lib/design/typography';
import { useTheme } from '@/lib/theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  optional?: boolean;
  required?: boolean;
  half?: boolean;
  helperText?: string;
  error?: string;
}

export function TextField({
  label,
  optional,
  required,
  half,
  helperText,
  error,
  style,
  ...props
}: TextFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const borderColor = error ? theme.colors.danger : theme.colors.border;

  return (
    <View style={[styles.wrap, half && styles.half, !label && styles.noLabel]}>
      {label ? (
        <AppText variant="caption" color="secondary" style={styles.label}>
          {label}
          {optional ? ` (${t('listing.optional')})` : ''}
          {required ? ' *' : ''}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.tertiary}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            color: theme.colors.primary,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <AppText variant="micro" color="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="micro" color="secondary" style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  half: { flex: 1, minWidth: '46%' },
  noLabel: { marginBottom: 0 },
  label: { marginBottom: spacing.xs, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typeSize.input,
  },
  helper: { marginTop: spacing.xs },
});
