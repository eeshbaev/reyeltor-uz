import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { toolInputStyle } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { formatIntegerInput, parseNumericInput } from '@/lib/tools/parseNumeric';
import { useTheme } from '@/lib/theme';

interface IntegerInputProps extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChangeValue: (value: number) => void;
  containerStyle?: ViewStyle;
  suffix?: string;
}

export function IntegerInput({
  value,
  onChangeValue,
  style,
  containerStyle,
  suffix,
  placeholder = '0',
  placeholderTextColor,
  ...rest
}: IntegerInputProps) {
  const theme = useTheme();
  const display = value > 0 ? formatIntegerInput(value) : '';

  return (
    <View style={[styles.row, containerStyle]}>
      <TextInput
        {...rest}
        style={[toolInputStyle(theme), { flex: 1 }, style]}
        value={display}
        onChangeText={(text) => onChangeValue(parseNumericInput(text))}
        keyboardType="numeric"
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
  suffix: { minWidth: 24, fontWeight: '600' },
});
