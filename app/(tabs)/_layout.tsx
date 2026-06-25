import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.secondary,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="map/index" options={{ title: t('tabs.map') }} />
      <Tabs.Screen name="tools" options={{ title: t('tabs.tools'), headerShown: false }} />
      <Tabs.Screen name="post/index" options={{ title: t('tabs.post') }} />
      <Tabs.Screen name="favorites/index" options={{ title: t('tabs.favorites') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), headerShown: false }} />
    </Tabs>
  );
}
