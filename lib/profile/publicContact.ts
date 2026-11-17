import type { User } from '@/types';

type PublicContactUser = Pick<User, 'phone' | 'phone_visible'> | null | undefined;

/** Phone shown to buyers on listings and agent profiles. */
export function getPublicPhone(user: PublicContactUser): string | null {
  if (!user?.phone?.trim()) return null;
  if (user.phone_visible === false) return null;
  return user.phone;
}
