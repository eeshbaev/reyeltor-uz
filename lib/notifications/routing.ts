import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;
import type { NotificationPayload } from '@/lib/notifications/types';

function parsePayload(data: Record<string, unknown> | undefined): NotificationPayload | null {
  if (!data || typeof data.route !== 'string') return null;
  return {
    category: (data.category as NotificationPayload['category']) ?? 'engagement',
    route: data.route,
    listingId: typeof data.listingId === 'string' ? data.listingId : undefined,
  };
}

export function navigateFromNotification(router: Router, data: Record<string, unknown> | undefined): void {
  const payload = parsePayload(data);
  if (!payload) return;

  if (payload.listingId) {
    router.push({ pathname: '/listing/[id]', params: { id: payload.listingId } });
    return;
  }

  router.push(payload.route as never);
}

export function payloadForRoute(
  category: NotificationPayload['category'],
  route: string,
  listingId?: string,
): NotificationPayload {
  return { category, route, ...(listingId ? { listingId } : {}) };
}
