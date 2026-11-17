#!/usr/bin/env node
/**
 * Pre-release checks: env vars, Supabase core + growth schema.
 * Usage: node scripts/verify-production.mjs
 */
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';

config();

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`⚠ ${message}`);
}

const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
for (const key of required) {
  if (!(process.env[key] ?? '').trim()) {
    fail(`Missing ${key}. Set it in .env and EAS production secrets.`);
  }
  ok(`${key} is set`);
}

if (!(process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '').trim()) {
  warn('EXPO_PUBLIC_MAPTILER_KEY is unset — map tiles will use the Carto fallback.');
} else {
  ok('EXPO_PUBLIC_MAPTILER_KEY is set');
}

console.log('\nRunning Supabase + growth schema checks...\n');

const result = spawnSync(process.execPath, ['scripts/verify-supabase.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('\nProduction preflight passed. Build with: npm run build:android:local (or eas build --profile production).');
