import * as Sharing from 'expo-sharing';
import { Linking, Platform, Share } from 'react-native';
import { PLAY_STORE_URL } from '@/lib/constants';
import { createPdfFromHtml } from '@/lib/tools/toolReport';

export async function shareViaTelegram(message: string): Promise<void> {
  const url = `https://t.me/share/url?url=${encodeURIComponent(PLAY_STORE_URL)}&text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}

export async function shareViaWhatsApp(message: string): Promise<void> {
  const appUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    if (canOpen) {
      await Linking.openURL(appUrl);
      return;
    }
  } catch {
    // fall through to system share
  }
  await Share.share({ message });
}

export async function shareViaSystem(message: string, title?: string): Promise<void> {
  const options = Platform.select({
    ios: { message, url: PLAY_STORE_URL, title },
    default: { message, title },
  });
  if (!options) return;
  await Share.share(options);
}

export async function sharePdfViaSystem(html: string, dialogTitle: string): Promise<void> {
  const uri = await createPdfFromHtml(html);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  await Share.share({ title: dialogTitle, url: uri });
}
