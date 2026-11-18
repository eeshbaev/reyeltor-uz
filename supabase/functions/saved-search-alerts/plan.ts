/**
 * Pure delivery planning for saved-search alerts (no I/O, unit-testable).
 *
 * Rules:
 * - At most DAILY_INSTANT_CAP instant pushes per user per Tashkent day.
 * - New matches for the same saved search found in one run are bundled into one push.
 * - Anything over the cap is deferred to the daily digest (one push per user per digest run).
 * - Users without a registered device are skipped (matches stay visible in the app).
 */
export const DAILY_INSTANT_CAP = 5;

export interface ClaimedMatch {
  match_id: string;
  search_id: string;
  search_name: string;
  /** 'last' = the user's latest map search (patch-alerts-v1.sql); older databases omit it. */
  search_kind?: 'saved' | 'last';
  user_id: string;
  listing_id: string;
  listing_district: string;
  locale: string;
}

export type PushKind = 'single' | 'multiple' | 'digest';

export interface PlannedPush {
  userId: string;
  kind: PushKind;
  matchIds: string[];
  locale: string;
  searchId?: string;
  searchName?: string;
  searchKind?: 'saved' | 'last';
  listingId?: string;
  district?: string;
  count: number;
}

export interface InstantPlan {
  pushes: PlannedPush[];
  deferToDigest: string[];
  skip: string[];
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function planInstant(
  rows: ClaimedMatch[],
  instantPushesToday: Map<string, number>,
  usersWithDevices: Set<string>,
  cap = DAILY_INSTANT_CAP,
): InstantPlan {
  const plan: InstantPlan = { pushes: [], deferToDigest: [], skip: [] };

  for (const [userId, userRows] of groupBy(rows, (r) => r.user_id)) {
    if (!usersWithDevices.has(userId)) {
      plan.skip.push(...userRows.map((r) => r.match_id));
      continue;
    }

    let used = instantPushesToday.get(userId) ?? 0;
    for (const [searchId, searchRows] of groupBy(userRows, (r) => r.search_id)) {
      const ids = searchRows.map((r) => r.match_id);
      if (used >= cap) {
        plan.deferToDigest.push(...ids);
        continue;
      }
      used += 1;
      const first = searchRows[0];
      plan.pushes.push({
        userId,
        kind: searchRows.length === 1 ? 'single' : 'multiple',
        matchIds: ids,
        locale: first.locale,
        searchId,
        searchName: first.search_name,
        searchKind: first.search_kind ?? 'saved',
        listingId: searchRows.length === 1 ? first.listing_id : undefined,
        district: first.listing_district,
        count: searchRows.length,
      });
    }
  }

  return plan;
}

export function planDigest(
  rows: ClaimedMatch[],
  usersWithDevices: Set<string>,
): { pushes: PlannedPush[]; skip: string[] } {
  const pushes: PlannedPush[] = [];
  const skip: string[] = [];

  for (const [userId, userRows] of groupBy(rows, (r) => r.user_id)) {
    const ids = userRows.map((r) => r.match_id);
    if (!usersWithDevices.has(userId)) {
      skip.push(...ids);
      continue;
    }
    pushes.push({
      userId,
      kind: 'digest',
      matchIds: ids,
      locale: userRows[0].locale,
      count: new Set(userRows.map((r) => r.listing_id)).size,
    });
  }

  return { pushes, skip };
}

/**
 * Quiet hours 22:00–08:00 Tashkent (manual ND-02): instant alerts wait and go out in the
 * first run after 08:00. Matching still happens; only sending pauses.
 */
export function isQuietHours(now: Date): boolean {
  const hour = (now.getUTCHours() + 5) % 24;
  return hour >= 22 || hour < 8;
}

/** Start of the current day in Asia/Tashkent (UTC+5, no DST), as a UTC Date. */
export function tashkentDayStartUtc(now: Date): Date {
  const offsetMs = 5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal - offsetMs);
}

/** Notification payload consumed by lib/notifications/routing.ts in the app. */
export function pushData(push: PlannedPush): Record<string, string> {
  if (push.kind === 'single' && push.listingId) {
    return {
      category: 'searches',
      kind: push.kind,
      route: '/listing/[id]',
      listingId: push.listingId,
      ...(push.searchId ? { searchId: push.searchId } : {}),
    };
  }
  return {
    category: 'searches',
    kind: push.kind,
    route: '/(tabs)/favorites?tab=searches',
    ...(push.searchId ? { searchId: push.searchId } : {}),
  };
}
