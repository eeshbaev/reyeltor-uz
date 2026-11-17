import { isValidFullName, isValidUzbekPhone } from '@/lib/validation';
import type { User } from '@/types';

export function isProfileComplete(profile: Pick<User, 'full_name' | 'phone' | 'phone_verified_at'>): boolean {
  // A phone confirmed through Telegram counts even if it is not an Uzbek number.
  const phoneOk = profile.phone_verified_at ? !!profile.phone?.trim() : isValidUzbekPhone(profile.phone);
  return isValidFullName(profile.full_name) && phoneOk;
}
