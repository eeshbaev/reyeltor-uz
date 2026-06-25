import { Alert, Linking, Platform } from 'react-native';

export function normalizeTelegramUsername(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim().replace(/^@/, '');
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(value)) return null;
  return value;
}

export function telegramProfileUrl(username: string): string {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) return 'https://t.me';
  return `https://t.me/${normalized}`;
}

export async function openTelegramChat(
  username: string | null | undefined,
  noProfileMessage: string,
  alertTitle = 'Telegram',
): Promise<boolean> {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) {
    Alert.alert(alertTitle, noProfileMessage);
    return false;
  }

  const appUrl = `tg://resolve?domain=${normalized}`;
  const webUrl = telegramProfileUrl(normalized);

  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
    return true;
  } catch {
    if (Platform.OS === 'web') {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
    Alert.alert(alertTitle, noProfileMessage);
    return false;
  }
}
