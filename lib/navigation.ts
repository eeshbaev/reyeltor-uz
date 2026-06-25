import type { Router } from 'expo-router';

/** Return guests to the main app without trapping them on auth screens. */
export function leaveAuthScreen(router: Router): void {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/map');
}
