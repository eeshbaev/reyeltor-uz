#!/usr/bin/env node
/**
 * Rebuild locale files from en.json structure + existing translations + fill patches.
 * Usage: node scripts/sync-translations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOCALES = ['ru', 'tr', 'zh'];

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function unflatten(flat) {
  const root = {};
  for (const [keyPath, value] of Object.entries(flat)) {
    const parts = keyPath.split('.');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] ??= {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

function readJson(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

const enTree = readJson('translations/en.json').translation;
const enFlat = flatten(enTree);
const enKeys = Object.keys(enFlat);

for (const lang of LOCALES) {
  const existingFlat = flatten(readJson(`translations/${lang}.json`)?.translation ?? {});
  const fillsFlat = readJson(`scripts/fills-${lang}.json`) ?? {};
  const allKeysFlat = readJson(`all-keys-translations.json`)?.[lang] ?? {};
  const finalFlat = readJson(`final-complete-translations.json`)?.[lang] ?? {};

  const merged = {};
  for (const key of enKeys) {
    const candidates = [
      fillsFlat[key],
      existingFlat[key],
      allKeysFlat[key],
      finalFlat[key],
    ].filter((v) => v != null && v !== '');

    let value = enFlat[key];
    for (const candidate of candidates) {
      if (candidate !== enFlat[key]) {
        value = candidate;
        break;
      }
    }
    merged[key] = value;
  }

  const outPath = path.join(ROOT, `translations/${lang}.json`);
  const payload = { translation: unflatten(merged) };
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  const sameAsEn = enKeys.filter((k) => merged[k] === enFlat[k]);
  console.log(`${lang}: ${enKeys.length} keys, ${sameAsEn.length} still English`);
  if (sameAsEn.length) {
    console.log(`  unchanged: ${sameAsEn.slice(0, 8).join(', ')}${sameAsEn.length > 8 ? '…' : ''}`);
  }
}
