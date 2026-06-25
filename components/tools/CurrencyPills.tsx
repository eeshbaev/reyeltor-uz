import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { toolPillStyle } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';
import type { PriceCurrency } from '@/types';

interface CurrencyPillsProps {
  value: PriceCurrency;
  onChange: (currency: PriceCurrency) => void;
}

export function CurrencyPills({ value, onChange }: CurrencyPillsProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {(['UZS', 'USD'] as PriceCurrency[]).map((currency) => {
        const active = value === currency;
        return (
          <Pressable
            key={currency}
            onPress={() => onChange(currency)}
            style={toolPillStyle(theme, active)}
          >
            <AppText variant="label" color={active ? 'onAccent' : 'primary'}>
              {t(`common.${currency.toLowerCase()}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
