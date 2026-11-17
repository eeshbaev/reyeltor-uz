#!/usr/bin/env node
/**
 * Checks that .env Supabase settings point to a live project.
 * Usage: node scripts/verify-supabase.mjs
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

if (!url || !anonKey) {
  fail('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

let host;
try {
  host = new URL(url).hostname;
} catch {
  fail(`Invalid EXPO_PUBLIC_SUPABASE_URL: ${url}`);
}

console.log(`Project host: ${host}`);

try {
  const health = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
    headers: { apikey: anonKey },
  });
  if (!health.ok) {
    fail(`Auth health check failed (${health.status}). Check URL and anon key.`);
  }
  ok('Auth server reachable');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/ENOTFOUND|getaddrinfo|fetch failed/i.test(message)) {
    fail(`Cannot resolve ${host}. Project deleted, wrong URL, or no internet.`);
  }
  fail(`Network error: ${message}`);
}

const supabase = createClient(url, anonKey);
const tables = ['users', 'listings', 'listing_photos', 'favorites', 'notification_preferences'];

for (const table of tables) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
  if (error) {
    if (table === 'notification_preferences') {
      fail(
        `Table "${table}" missing. Run supabase/apply-missing-patches.sql in the Supabase SQL Editor.`,
      );
    }
    fail(`Table "${table}" missing or blocked: ${error.message}. Run supabase/schema.sql first.`);
  }
  ok(`Table "${table}" exists`);
}

const { data: phoneVisibleProbe, error: phoneVisibleError } = await supabase
  .from('users')
  .select('phone_visible')
  .limit(1);
if (phoneVisibleError || !phoneVisibleProbe) {
  fail(
    `Column users.phone_visible missing${phoneVisibleError ? `: ${phoneVisibleError.message}` : ''}. Run supabase/apply-missing-patches.sql.`,
  );
}
ok('Column "users.phone_visible" exists');

// listBuckets() requires the service role; anon key always returns [].
const { error: bucketError } = await supabase.storage.from('reyeltor-listings').list('', { limit: 1 });
if (bucketError) {
  fail(
    `Storage bucket "reyeltor-listings" not found or not accessible: ${bucketError.message}. Run supabase/storage-setup.sql.`,
  );
}
ok('Storage bucket "reyeltor-listings" exists');

const growthTables = ['referral_codes', 'referral_events', 'listing_engagement_stats'];

for (const table of growthTables) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
  if (error) {
    fail(
      `Growth table "${table}" missing or blocked: ${error.message}. Run supabase/patch-growth.sql in the Supabase SQL Editor.`,
    );
  }
  ok(`Growth table "${table}" exists`);
}

console.log('\nSupabase looks ready. Restart Metro with --clear, then register a new account in the app.');
