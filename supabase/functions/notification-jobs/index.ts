import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getPushCopy, sendExpoPush, type ExpoPushMessage } from '../_shared/push.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface PushTokenRow {
  expo_push_token: string;
}

interface PreferenceRow {
  user_id: string;
  listings_enabled: boolean;
  favorites_enabled: boolean;
  engagement_enabled: boolean;
  locale: string;
}

function authorized(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (cronSecret && headerSecret === cronSecret) return true;

  const auth = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(serviceKey && auth === `Bearer ${serviceKey}`);
}

async function alreadySent(
  admin: SupabaseClient,
  userId: string,
  dedupKey: string,
): Promise<boolean> {
  const { data } = await admin
    .from('notification_dedup')
    .select('id')
    .eq('user_id', userId)
    .eq('dedup_key', dedupKey)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(
  admin: SupabaseClient,
  userId: string,
  dedupKey: string,
  category: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  await admin.from('notification_dedup').upsert(
    { user_id: userId, dedup_key: dedupKey },
    { onConflict: 'user_id,dedup_key' },
  );

  await admin.from('notification_log').insert({
    user_id: userId,
    category,
    title,
    body,
    data,
  });
}

async function tokensForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await admin.from('push_tokens').select('expo_push_token').eq('user_id', userId);
  return ((data ?? []) as PushTokenRow[]).map((row) => row.expo_push_token);
}

async function sendToUser(
  admin: SupabaseClient,
  userId: string,
  category: string,
  title: string,
  body: string,
  data: Record<string, string>,
  dedupKey: string,
  enabled: boolean,
): Promise<number> {
  if (!enabled) return 0;
  if (await alreadySent(admin, userId, dedupKey)) return 0;

  const tokens = await tokensForUser(admin, userId);
  if (tokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: 'default',
    channelId: category,
    data,
  }));

  await sendExpoPush(messages);
  await markSent(admin, userId, dedupKey, category, title, body, data);
  return messages.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  let sent = 0;

  // Archive listings past their expiry (patch-freshness-v1.sql). Ignored if the patch is not applied.
  const { data: archivedCount, error: archiveError } = await admin.rpc('archive_expired_listings');
  if (archiveError) console.warn('archive_expired_listings failed:', archiveError.message);

  // Delete listings whose 30-day archive grace period is over, then their photo files.
  let purged = 0;
  const { data: purgedRows, error: purgeError } = await admin.rpc('purge_deleted_listings', { p_limit: 500 });
  if (purgeError) {
    console.warn('purge_deleted_listings failed:', purgeError.message);
  } else {
    const rows = (purgedRows ?? []) as { listing_id: string; storage_path: string | null }[];
    purged = new Set(rows.map((r) => r.listing_id)).size;
    const paths = rows
      .map((r) => r.storage_path)
      .filter((p): p is string => !!p && !p.includes(':') && !p.startsWith('http'));
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from('reyeltor-listings').remove(paths.slice(i, i + 100));
      if (error) console.warn('photo cleanup failed:', error.message);
    }
  }

  // Availability check-ins: owners whose listing was last confirmed 14+ days ago,
  // reminded at most once per 14-day period per listing.
  const { data: unconfirmed } = await admin
    .from('listings')
    .select('id, user_id, availability_confirmed_at')
    .eq('status', 'active')
    .lte('availability_confirmed_at', new Date(Date.now() - 14 * 86400000).toISOString());

  for (const row of unconfirmed ?? []) {
    const ageDays = Math.floor((Date.now() - new Date(row.availability_confirmed_at as string).getTime()) / 86400000);
    const { data: pref } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const copy = getPushCopy('confirmAvailability', (pref as PreferenceRow | null)?.locale);
    sent += await sendToUser(
      admin,
      row.user_id as string,
      'listings',
      copy.title,
      copy.body,
      { category: 'listings', route: '/profile/my-listings' },
      `confirm-${row.id}-${row.availability_confirmed_at}-${Math.floor(ageDays / 14)}`,
      (pref as PreferenceRow | null)?.listings_enabled ?? true,
    );
  }

  // Listing expiry — 15 days
  const { data: expiry15 } = await admin
    .from('listings')
    .select('id, user_id')
    .eq('status', 'active')
    .gte('expires_at', new Date(Date.now() + 14.5 * 86400000).toISOString())
    .lte('expires_at', new Date(Date.now() + 15.5 * 86400000).toISOString());

  for (const row of expiry15 ?? []) {
    const { data: pref } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const copy = getPushCopy('expiry15', (pref as PreferenceRow | null)?.locale);
    sent += await sendToUser(
      admin,
      row.user_id,
      'listings',
      copy.title,
      copy.body,
      { category: 'listings', route: '/profile/my-listings' },
      `expiry15-${row.id}`,
      (pref as PreferenceRow | null)?.listings_enabled ?? true,
    );
  }

  // Listing expiry — 5 days
  const { data: expiry5 } = await admin
    .from('listings')
    .select('id, user_id')
    .eq('status', 'active')
    .gte('expires_at', new Date(Date.now() + 4.5 * 86400000).toISOString())
    .lte('expires_at', new Date(Date.now() + 5.5 * 86400000).toISOString());

  for (const row of expiry5 ?? []) {
    const { data: pref } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const copy = getPushCopy('expiry5', (pref as PreferenceRow | null)?.locale);
    sent += await sendToUser(
      admin,
      row.user_id,
      'listings',
      copy.title,
      copy.body,
      { category: 'listings', route: '/profile/my-listings' },
      `expiry5-${row.id}`,
      (pref as PreferenceRow | null)?.listings_enabled ?? true,
    );
  }

  // Archived listing delete — 10 days before deletes_at
  const { data: deleteSoon } = await admin
    .from('listings')
    .select('id, user_id, deletes_at')
    .eq('status', 'archived')
    .not('deletes_at', 'is', null)
    .gte('deletes_at', new Date(Date.now() + 9.5 * 86400000).toISOString())
    .lte('deletes_at', new Date(Date.now() + 10.5 * 86400000).toISOString());

  for (const row of deleteSoon ?? []) {
    const { data: pref } = await admin
      .from('notification_preferences')
      .select('*')
      .eq('user_id', row.user_id)
      .maybeSingle();

    const copy = getPushCopy('delete10', (pref as PreferenceRow | null)?.locale);
    sent += await sendToUser(
      admin,
      row.user_id,
      'listings',
      copy.title,
      copy.body,
      { category: 'listings', route: '/profile/my-listings' },
      `delete10-${row.id}`,
      (pref as PreferenceRow | null)?.listings_enabled ?? true,
    );
  }

  // Price drops on favorites are sent every 5 minutes by saved-search-alerts (≥3% only).

  return new Response(JSON.stringify({ ok: true, sent, archived: archivedCount ?? 0, purged }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
