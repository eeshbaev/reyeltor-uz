import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sharePdfViaSystem,
  shareViaSystem,
  shareViaTelegram,
  shareViaWhatsApp,
} from '@/lib/growth/shareChannels';

const LAST_SHARE_CHANNEL_KEY = '@reyeltor/last_share_channel';

export type ShareChannel = 'telegram' | 'whatsapp' | 'pdf' | 'other';

export interface SharePayload {
  title: string;
  message: string;
  pdf?: {
    buildHtml: () => Promise<string>;
    dialogTitle: string;
  };
}

export async function getLastShareChannel(): Promise<ShareChannel | null> {
  try {
    const stored = await AsyncStorage.getItem(LAST_SHARE_CHANNEL_KEY);
    if (stored === 'telegram' || stored === 'whatsapp' || stored === 'pdf' || stored === 'other') {
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setLastShareChannel(channel: ShareChannel): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SHARE_CHANNEL_KEY, channel);
  } catch {
    // ignore
  }
}

export async function sharePayloadViaChannel(channel: ShareChannel, payload: SharePayload): Promise<void> {
  if (channel === 'telegram') {
    await shareViaTelegram(payload.message);
    return;
  }
  if (channel === 'whatsapp') {
    await shareViaWhatsApp(payload.message);
    return;
  }
  if (channel === 'pdf' && payload.pdf) {
    const html = await payload.pdf.buildHtml();
    if (html) {
      await sharePdfViaSystem(html, payload.pdf.dialogTitle);
      return;
    }
  }
  if (payload.pdf) {
    const html = await payload.pdf.buildHtml();
    if (html) {
      await sharePdfViaSystem(html, payload.pdf.dialogTitle);
      return;
    }
  }
  await shareViaSystem(payload.message, payload.title);
}
