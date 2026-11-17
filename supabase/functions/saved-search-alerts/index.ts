/**
 * Saved-search alerts.
 *
 *   POST /functions/v1/saved-search-alerts?mode=instant   — every 5 minutes
 *   POST /functions/v1/saved-search-alerts?mode=digest    — once a day (20:00 Tashkent)
 *
 * instant: refreshes the CBU USD rate (twice a day), matches new listings against
 *          saved searches (database function), then pushes — max 5 per user per day.
 *          Matches over the cap are deferred to the digest.
 * digest:  sends one summary push per user for everything deferred that day.
 *
 * Auth: header x-cron-secret: <CRON_SECRET>, or the service role key as Bearer token.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { sendExpoPush, type ExpoPushMessage } from '../_shared/push.ts';
import { getPriceDropCopy, priceDropPushData, type PriceDropRow } from '../_shared/priceDropPush.ts';
import { getSearchPushCopy } from '../_shared/searchPush.ts';
import {
  type ClaimedMatch,
  type PlannedPush,
  planDigest,
  planInstant,
  pushData,
  tashkentDayStartUtc,
} from './plan.ts';

type Admin = SupabaseClient;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const FX_REFRESH_MS = 12 * 60 * 60 * 1000;
const CBU_USD_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD/';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function authorized(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) return true;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey && req.headers.get('Authorization') === `Bearer ${serviceKey}`);
}

async function refreshUsdRate(admin: Admin): Promise<void> {
  const { data } = await admin.from('fx_rates').select('updated_at, source').eq('currency', 'USD').maybeSingle();
  const updatedAt = data?.updated_at ? new Date(data.updated_at as string).getTime() : 0;
  if (data?.source === 'cbu' && Date.now() - updatedAt < FX_REFRESH_MS) return;

  try {
    const res = await fetch(CBU_USD_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return;
    const rows = (await res.json()) as Array<{ Rate?: string }>;
    const rate = Number(rows?.[0]?.Rate);
    if (!Number.isFinite(rate) || rate <= 0) return;
    await admin
      .from('fx_rates')
      .upsert({ currency: 'USD', uzs_per_unit: rate, source: 'cbu', updated_at: new Date().toISOString() });
  } catch (error) {
    // Keep the last known rate; matching still works.
    console.warn('CBU rate refresh failed:', error);
  }
}

async function devicesByUser(admin: Admin, userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  const { data } = await admin.from('push_tokens').select('user_id, expo_push_token').in('user_id', userIds);
  for (const row of (data ?? []) as Array<{ user_id: string; expo_push_token: string }>) {
    const list = map.get(row.user_id) ?? [];
    list.push(row.expo_push_token);
    map.set(row.user_id, list);
  }
  return map;
}

async function instantPushesToday(admin: Admin, userIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;
  const { data } = await admin
    .from('notification_log')
    .select('user_id, data')
    .eq('category', 'searches')
    .in('user_id', userIds)
    .gte('created_at', tashkentDayStartUtc(new Date()).toISOString());
  for (const row of (data ?? []) as Array<{ user_id: string; data: { kind?: string } | null }>) {
    if (row.data?.kind === 'single' || row.data?.kind === 'multiple') {
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
  }
  return counts;
}

async function setStatus(admin: Admin, ids: string[], status: string, delivered: boolean): Promise<void> {
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    await admin
      .from('saved_search_matches')
      .update({
        status,
        claimed_at: null,
        ...(delivered ? { delivered_at: new Date().toISOString() } : {}),
      })
      .in('id', chunk);
  }
}

async function deliver(admin: Admin, pushes: PlannedPush[], devices: Map<string, string[]>): Promise<number> {
  const messages: ExpoPushMessage[] = [];
  const logs: Array<Record<string, unknown>> = [];

  for (const push of pushes) {
    const copy = getSearchPushCopy(
      push.kind,
      push.locale,
      { name: push.searchName, count: push.count, district: push.district },
      push.searchKind,
    );
    const data = pushData(push);
    for (const token of devices.get(push.userId) ?? []) {
      messages.push({ to: token, title: copy.title, body: copy.body, sound: 'default', channelId: 'searches', data });
    }
    logs.push({ user_id: push.userId, category: 'searches', title: copy.title, body: copy.body, data });
  }

  await sendExpoPush(messages);
  for (let i = 0; i < logs.length; i += 200) {
    await admin.from('notification_log').insert(logs.slice(i, i + 200));
  }
  return messages.length;
}

async function runInstant(admin: Admin) {
  await refreshUsdRate(admin);

  const { data: matched, error: enqueueError } = await admin.rpc('enqueue_saved_search_matches', { p_limit: 200 });
  if (enqueueError) throw enqueueError;

  const { data: claimed, error: claimError } = await admin.rpc('claim_saved_search_matches', {
    p_mode: 'instant',
    p_limit: 500,
  });
  if (claimError) throw claimError;

  const rows = (claimed ?? []) as ClaimedMatch[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const devices = await devicesByUser(admin, userIds);
  const plan = planInstant(rows, await instantPushesToday(admin, userIds), new Set(devices.keys()));

  const sent = await deliver(admin, plan.pushes, devices);
  await setStatus(admin, plan.pushes.flatMap((p) => p.matchIds), 'pushed', true);
  await setStatus(admin, plan.deferToDigest, 'digest', false);
  await setStatus(admin, plan.skip, 'skipped', true);

  const priceDrops = await runPriceDrops(admin);

  return {
    ...priceDrops,
    newMatches: matched ?? 0,
    claimed: rows.length,
    pushes: plan.pushes.length,
    messages: sent,
    deferredToDigest: plan.deferToDigest.length,
    skipped: plan.skip.length,
  };
}

/** Favorites that got at least 3% cheaper since they were saved (or since the last alert). */
async function runPriceDrops(admin: Admin) {
  const { data, error } = await admin.rpc('claim_price_drop_alerts', { p_min_drop: 0.03, p_limit: 1000 });
  if (error) {
    // Older database without patch-alerts-v1.sql: skip quietly.
    console.warn('claim_price_drop_alerts failed:', error.message);
    return { priceDrops: 0, priceDropMessages: 0 };
  }
  const rows = ((data ?? []) as PriceDropRow[]).filter((r) => r.favorites_enabled !== false);
  const devices = await devicesByUser(admin, [...new Set(rows.map((r) => r.user_id))]);
  const messages: ExpoPushMessage[] = [];
  const logs: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const copy = getPriceDropCopy(row);
    const pushPayload = priceDropPushData(row);
    for (const token of devices.get(row.user_id) ?? []) {
      messages.push({ to: token, title: copy.title, body: copy.body, sound: 'default', channelId: 'favorites', data: pushPayload });
    }
    logs.push({ user_id: row.user_id, category: 'favorites', title: copy.title, body: copy.body, data: pushPayload });
  }
  await sendExpoPush(messages);
  for (let i = 0; i < logs.length; i += 200) {
    await admin.from('notification_log').insert(logs.slice(i, i + 200));
  }
  return { priceDrops: rows.length, priceDropMessages: messages.length };
}

async function runDigest(admin: Admin) {
  const { data: claimed, error } = await admin.rpc('claim_saved_search_matches', { p_mode: 'digest', p_limit: 5000 });
  if (error) throw error;

  const rows = (claimed ?? []) as ClaimedMatch[];
  const devices = await devicesByUser(admin, [...new Set(rows.map((r) => r.user_id))]);
  const plan = planDigest(rows, new Set(devices.keys()));

  const sent = await deliver(admin, plan.pushes, devices);
  await setStatus(admin, plan.pushes.flatMap((p) => p.matchIds), 'digested', true);
  await setStatus(admin, plan.skip, 'skipped', true);

  return { claimed: rows.length, pushes: plan.pushes.length, messages: sent, skipped: plan.skip.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!authorized(req)) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Missing Supabase env' }, 500);

  const admin = createClient(supabaseUrl, serviceKey);
  const mode = new URL(req.url).searchParams.get('mode') ?? 'instant';

  try {
    if (mode === 'digest') return json({ ok: true, mode, ...(await runDigest(admin)) });
    if (mode === 'instant') return json({ ok: true, mode, ...(await runInstant(admin)) });
    return json({ error: `Unknown mode: ${mode}` }, 400);
  } catch (error) {
    console.error('saved-search-alerts failed:', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
