import { Linking } from 'react-native';
import { SUPPORT_CONTACT_EMAIL } from '@/lib/constants';

export function openSupportEmail(subject: string, body: string): void {
  const params = new URLSearchParams({ subject, body });
  void Linking.openURL(`mailto:${SUPPORT_CONTACT_EMAIL}?${params.toString()}`);
}
