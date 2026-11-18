import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/navigation/BackButton';
import { fixedColors } from '@/lib/design/colors';
import { useTheme } from '@/lib/theme';

export default function ToolsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          letterSpacing: -0.3,
        },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: route.name === 'index' ? undefined : () => <BackButton href="/(tabs)/tools" />,
        contentStyle: { backgroundColor: theme.isDark ? theme.colors.background : fixedColors.paper },
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="mortgage" options={{ title: t('tools.mortgage.title'), headerShown: true }} />
      <Stack.Screen name="rent-vs-buy" options={{ title: t('tools.rentVsBuy.title'), headerShown: true }} />
      <Stack.Screen name="affordability" options={{ title: t('tools.affordability.title'), headerShown: true }} />
      <Stack.Screen name="moving-costs" options={{ title: t('tools.movingCosts.title'), headerShown: true }} />
      <Stack.Screen name="renovation" options={{ title: t('tools.renovation.title'), headerShown: true }} />
      <Stack.Screen name="district-comparison" options={{ title: t('tools.districtComparison.title'), headerShown: true }} />
      <Stack.Screen name="currency-history" options={{ title: t('tools.currencyHistory.title'), headerShown: true }} />
    </Stack>
  );
}
