import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Session storage for supabase-js backed by the Android Keystore / iOS Keychain
 * (expo-secure-store) — manual SP-02. SecureStore values are limited to ~2 KB, and a
 * Supabase session is larger, so values are split into chunks.
 *
 * Migration: a session saved earlier in AsyncStorage is moved into secure storage on first read.
 * Fallback: an app build without the native module keeps using AsyncStorage (never crashes).
 */
type SecureStoreModule = typeof import('expo-secure-store');

let secure: SecureStoreModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  secure = require('expo-secure-store') as SecureStoreModule;
} catch {
  secure = null;
}

const CHUNK = 1800;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${safeKey(key)}.chunks`;
const chunkKey = (key: string, i: number) => `${safeKey(key)}.${i}`;

async function secureGet(store: SecureStoreModule, key: string): Promise<string | null> {
  const count = Number(await store.getItemAsync(countKey(key)));
  if (!count) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await store.getItemAsync(chunkKey(key, i));
    if (part == null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function secureRemove(store: SecureStoreModule, key: string): Promise<void> {
  const count = Number(await store.getItemAsync(countKey(key))) || 0;
  for (let i = 0; i < count; i += 1) await store.deleteItemAsync(chunkKey(key, i));
  await store.deleteItemAsync(countKey(key));
}

async function secureSet(store: SecureStoreModule, key: string, value: string): Promise<void> {
  await secureRemove(store, key);
  const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, 'g')) ?? [''];
  for (let i = 0; i < parts.length; i += 1) await store.setItemAsync(chunkKey(key, i), parts[i]!);
  await store.setItemAsync(countKey(key), String(parts.length));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!secure) return AsyncStorage.getItem(key);
    try {
      const value = await secureGet(secure, key);
      if (value != null) return value;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy != null) {
        await secureSet(secure, key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!secure) return AsyncStorage.setItem(key, value);
    try {
      await secureSet(secure, key, value);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key).catch(() => undefined);
    if (secure) await secureRemove(secure, key).catch(() => undefined);
  },
};
