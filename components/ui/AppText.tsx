import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLineHeight, typography, type TypographyVariant } from '@/lib/design/typography';
import { useTheme } from '@/lib/theme';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'danger' | 'success' | 'warning' | 'onAccent';
}

export function AppText({ variant = 'body', color = 'primary', style, ...props }: AppTextProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();

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

  return <Text allowFontScaling style={[textStyle, style]} {...props} />;
}
