/**
 * EAS local builds copy the project to /tmp and run a fresh npm install.
 * On slow networks that often times out. When REYELTOR_SOURCE_ROOT is set
 * (see package.json build:android:local), copy node_modules from the real project first
 * so npm install mostly verifies offline.
 */
import { cpSync, existsSync } from 'fs';
import { join } from 'path';

const sourceRoot = process.env.REYELTOR_SOURCE_ROOT;
if (!sourceRoot) {
  console.log('[eas-pre-install] REYELTOR_SOURCE_ROOT not set — using normal npm install');
  process.exit(0);
}

const source = join(sourceRoot, 'node_modules');
const target = join(process.cwd(), 'node_modules');

if (!existsSync(source)) {
  console.warn('[eas-pre-install] No node_modules at', source, '— run npm install first');
  process.exit(0);
}

if (existsSync(target)) {
  console.log('[eas-pre-install] node_modules already present — skipping copy');
  process.exit(0);
}

console.log('[eas-pre-install] Copying node_modules from project (avoids re-downloading packages)...');
cpSync(source, target, { recursive: true });
console.log('[eas-pre-install] Copy complete.');

const envSource = join(sourceRoot, '.env');
const envTarget = join(process.cwd(), '.env');
if (existsSync(envSource) && !existsSync(envTarget)) {
  console.log('[eas-pre-install] Copying .env for EXPO_PUBLIC_* vars...');
  cpSync(envSource, envTarget);
}
