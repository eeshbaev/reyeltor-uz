import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { toolInputStyle } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { formatDecimalInput, parseNumericInput } from '@/lib/tools/parseNumeric';
import { useTheme } from '@/lib/theme';

interface PercentInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChangeValue: (value: number) => void;
  containerStyle?: ViewStyle;
  fractionDigits?: number;
}

export function PercentInput({
  value,
  onChangeValue,
  style,
  containerStyle,
  fractionDigits = 1,
  placeholder = '0',
  placeholderTextColor,
  ...rest
}: PercentInputProps) {
  const theme = useTheme();
  const display = value > 0 ? formatDecimalInput(value, fractionDigits) : '';

  return (
    <View style={[styles.row, containerStyle]}>
      <TextInput
        {...rest}
        style={[toolInputStyle(theme), { flex: 1 }, style]}
        value={display}
        onChangeText={(text) => onChangeValue(parseNumericInput(text))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? theme.colors.tertiary}
      />
      <AppText variant="caption" color="secondary" style={styles.suffix}>
        %
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  suffix: { minWidth: 16, fontWeight: '600' },
});
