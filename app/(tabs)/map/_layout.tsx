import { Stack } from 'expo-router';

/** Map tab is full-bleed — never show the default app title bar on Android. */
export default function MapLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        header: () => null,
        title: '',
      }}
    />
  );
}
