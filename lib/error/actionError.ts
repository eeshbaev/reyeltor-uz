import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

/**
 * One pattern for every failed action (design doc: States — PF-04/PF-05):
 *   title  = what didn't happen ("Couldn't publish the listing")
 *   body   = what is safe + what to do, worded for the real cause (offline vs. server).
 * Never "Something went wrong" on its own.
 */
export type FailedAction =
  | 'saveBio'
  | 'saveProfile'
  | 'saveAvatar'
  | 'savePurposes'
  | 'publishListing'
  | 'updateListing'
  | 'updatePrice'
  | 'confirmListing'
  | 'reactivateListing'
  | 'savedSearch'
  | 'shareImage';

const NETWORK_HINTS = ['network request failed', 'failed to fetch', 'network', 'timeout', 'timed out', 'aborted'];

export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : String(error);
  const lower = message.toLowerCase();
  return NETWORK_HINTS.some((hint) => lower.includes(hint));
}

export function actionErrorText(t: TFunction, action: FailedAction, error?: unknown): { title: string; body: string } {
  const title = t(`actionErrors.${action}.title`);
  const safe = t(`actionErrors.${action}.safe`);
  const next = isNetworkError(error) ? t('actionErrors.offlineNext') : t('actionErrors.serverNext');
  return { title, body: `${safe} ${next}` };
}

export function showActionError(t: TFunction, action: FailedAction, error?: unknown): void {
  const { title, body } = actionErrorText(t, action, error);
  Alert.alert(title, body);
}
