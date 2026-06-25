import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/lib/design/spacing';
import { formatDecimalInput, formatIntegerInput, parseNumericInput } from '@/lib/tools/parseNumeric';
import { toolInputStyle } from '@/lib/design/toolChrome';
import { useTheme } from '@/lib/theme';

interface MoneyInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChangeValue: (value: number) => void;
  containerStyle?: ViewStyle;
  suffix?: string;
  /** 0 = whole numbers, 2 = cents for USD */
  decimals?: number;
}

export function MoneyInput({
  value,
  onChangeValue,
  style,
  containerStyle,
  suffix = 'UZS',
  decimals = 0,
  placeholder = '0',
  placeholderTextColor,
  ...rest
}: MoneyInputProps) {
  const theme = useTheme();
  const display =
    value > 0
      ? decimals > 0
        ? formatDecimalInput(value, decimals)
        : formatIntegerInput(value)
      : '';

  return (
    <View style={[styles.row, containerStyle]}>
      <TextInput
        {...rest}
        style={[
          toolInputStyle(theme),
          { flex: 1 },
          style,
        ]}
        value={display}
        onChangeText={(text) => onChangeValue(parseNumericInput(text))}
        keyboardType={decimals > 0 ? 'decimal-pad' : 'numeric'}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? theme.colors.tertiary}
      />
      {suffix ? (
        <AppText variant="caption" color="secondary" style={styles.suffix}>
          {suffix}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  suffix: { minWidth: 32, fontWeight: '600' },
});
