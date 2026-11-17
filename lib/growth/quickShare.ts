import type { RefObject } from 'react';
import type { SharePayload, ShareChannel } from '@/lib/growth/sharePreference';
import {
  getLastShareChannel,
  setLastShareChannel,
  sharePayloadViaChannel,
} from '@/lib/growth/sharePreference';
import { hapticLight } from '@/lib/haptics';

export type { ShareChannel, SharePayload } from '@/lib/growth/sharePreference';

/** Tap: repeat last channel (1 tap) or open picker (2 taps first time). Long-press: always pick. */
export async function quickShare(
  payload: SharePayload,
  sheetRef: RefObject<{ present: (payload: SharePayload) => void } | null>,
  options?: { forcePicker?: boolean },
): Promise<void> {
  hapticLight();

  if (options?.forcePicker) {
    sheetRef.current?.present(payload);
    return;
  }

  const last = await getLastShareChannel();
  if (last && (last !== 'pdf' || payload.pdf)) {
    try {
      await sharePayloadViaChannel(last, payload);
      await setLastShareChannel(last);
      return;
    } catch (error) {
      console.warn('Quick share failed, opening picker:', error);
    }
  }

  sheetRef.current?.present(payload);
}

export async function shareViaChannelAndRemember(
  channel: ShareChannel,
  payload: SharePayload,
): Promise<void> {
  await sharePayloadViaChannel(channel, payload);
  await setLastShareChannel(channel);
}
