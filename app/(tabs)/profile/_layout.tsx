import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LanguageHeaderButton } from '@/components/i18n/LanguageHeaderButton';
import { BackButton } from '@/components/navigation/BackButton';
import { useTheme } from '@/lib/theme';

export default function ProfileLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { fontSize: 18, fontWeight: '700' },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerBackVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="login"
        options={{
          title: t('auth.login'),
          headerLeft: () => <BackButton href="/(tabs)/profile" />,
          headerRight: () => <LanguageHeaderButton />,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: t('auth.register'),
          headerLeft: () => <BackButton href="/(tabs)/profile" />,
          headerRight: () => <LanguageHeaderButton />,
        }}
      />
    </Stack>
  );
}
