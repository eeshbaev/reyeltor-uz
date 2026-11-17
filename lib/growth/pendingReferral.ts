import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { PENDING_REFERRAL_CODE_KEY } from '@/lib/constants';

const CODE_PATTERN = /(?:taklif\s*kodi|referral\s*code|kod)[:\s]*([A-Z0-9]{4,12})/i;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4 || code.length > 12) return null;
  return code;
}

export function parseReferralCodeFromText(text: string): string | null {
  const match = text.match(CODE_PATTERN);
  if (match?.[1]) {
    return normalizeReferralCode(match[1]);
  }

  const trimmed = text.trim();
  if (/^[A-Z0-9]{4,12}$/i.test(trimmed)) {
    return normalizeReferralCode(trimmed);
  }

  return null;
}

/** Read clipboard on app open and stash a referral code for registration. */
export async function captureReferralFromClipboard(): Promise<string | null> {
  // Dev clients built before expo-clipboard was added lack the native module.
  if (!requireOptionalNativeModule('ExpoClipboard')) return null;

  try {
    const Clipboard = await import('expo-clipboard');
    const hasString = await Clipboard.hasStringAsync();
    if (!hasString) return null;

    const text = await Clipboard.getStringAsync();
    const code = parseReferralCodeFromText(text);
    if (!code) return null;

    await storePendingReferralCode(code);
    return code;
  } catch {
    return null;
  }
}

export async function storePendingReferralCode(code: string): Promise<void> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, normalized);
}

export async function getPendingReferralCode(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  return normalizeReferralCode(stored);
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
}
