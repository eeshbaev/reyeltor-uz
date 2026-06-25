import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/navigation/BackButton';
import { useTheme } from '@/lib/theme';

export default function ToolsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'index',
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
        contentStyle: { backgroundColor: theme.isDark ? theme.colors.background : '#F4F6FA' },
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="mortgage" options={{ title: t('tools.mortgage.title') }} />
      <Stack.Screen name="rent-vs-buy" options={{ title: t('tools.rentVsBuy.title') }} />
      <Stack.Screen name="affordability" options={{ title: t('tools.affordability.title') }} />
      <Stack.Screen name="moving-costs" options={{ title: t('tools.movingCosts.title') }} />
      <Stack.Screen name="renovation" options={{ title: t('tools.renovation.title') }} />
      <Stack.Screen name="district-comparison" options={{ title: t('tools.districtComparison.title') }} />
      <Stack.Screen name="currency-history" options={{ title: t('tools.currencyHistory.title') }} />
    </Stack>
  );
}
