import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      key={i18n.language}
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        ...(Platform.OS === 'android' ? { header: () => null } : {}),
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondary,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="map" options={{ title: t('tabs.map'), headerShown: false }} />
      <Tabs.Screen name="tools" options={{ title: t('tabs.tools'), headerShown: false }} />
      <Tabs.Screen name="post/index" options={{ title: t('tabs.post'), headerShown: false }} />
      <Tabs.Screen name="favorites/index" options={{ title: t('tabs.favorites'), headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), headerShown: false }} />
    </Tabs>
  );
}
