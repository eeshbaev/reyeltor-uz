import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { fontFamilyFor, useFontsLoaded } from '@/lib/design/fonts';
import { getLineHeight, typography, type TypographyVariant } from '@/lib/design/typography';
import { useTheme } from '@/lib/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'warning' | 'onAccent';
  /** Equal-width digits, for prices and counts that change in place. */
  tabular?: boolean;
}

export function AppText({ variant = 'body', color = 'primary', tabular = false, style, ...props }: AppTextProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const fontsReady = useFontsLoaded();

  const colorMap = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    tertiary: theme.colors.tertiary,
    accent: theme.colors.accent,
    danger: theme.colors.danger,
    success: theme.colors.success,
    warning: theme.colors.warning,
    onAccent: theme.colors.onAccent,
  };

  const textStyle: TextStyle = {
    ...typography[variant],
    lineHeight: getLineHeight(variant, i18n.language === 'ar'),
    color: colorMap[color],
  };

  // Inter has one file per weight: pick it from the final weight and drop fontWeight so
  // Android doesn't fake-bold an already bold face.
  const weight = StyleSheet.flatten([textStyle, style])?.fontWeight;
  const family = fontFamilyFor(weight, fontsReady);
  const fontStyle: TextStyle | null = family ? { fontFamily: family, fontWeight: 'normal' } : null;

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[textStyle, style, fontStyle, tabular ? styles.tabular : null]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
});
