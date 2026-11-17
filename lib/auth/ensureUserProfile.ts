import type { User } from '@supabase/supabase-js';
import { looksLikePhoneNumber, pickProfileFullName } from '@/lib/auth/displayName';
import { realEmail } from '@/lib/auth/placeholderEmail';
import { getRegisteredFullName } from '@/lib/onboarding/storage';
import { supabase } from '@/lib/supabase';

function profileNameNeedsRepair(fullName: string): boolean {
  const trimmed = fullName.trim();
  return !trimmed || looksLikePhoneNumber(trimmed) || trimmed === 'User';
}

export async function ensureUserProfile(user: User): Promise<boolean> {
  const registeredFullName = await getRegisteredFullName(user.id);
  const { data: existing } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    if (profileNameNeedsRepair(existing.full_name)) {
      await repairProfileNameIfNeeded(user, existing, registeredFullName);
    }
    return true;
  }

  const email = realEmail(user.email);
  const fullName =
    pickProfileFullName({
      registeredFullName,
      metadataName:
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : undefined,
      email: email ?? undefined,
    }) ?? 'User';
  const phone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone.trim() : '';
  // Telegram registrations have no email (or an internal placeholder sign-in address).

  if (!phone) {
    console.warn('ensureUserProfile: missing phone on auth user');
    return false;
  }

  const { error: profileError } = await supabase.from('users').upsert(
    {
      id: user.id,
      full_name: fullName,
      phone,
      email,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.warn('ensureUserProfile failed:', profileError.message);
    return false;
  }

  // Welcome coins are granted server-side (new rows always start at 15; ledger row via handle_new_user).
  return true;
}

export async function repairProfileNameIfNeeded(
  authUser: User,
  profile: { id: string; full_name: string; email?: string | null },
  registeredFullName?: string,
): Promise<string | null> {
  if (!profileNameNeedsRepair(profile.full_name)) return null;

  const storedRegisteredFullName = registeredFullName ?? (await getRegisteredFullName(authUser.id));
  const better = pickProfileFullName({
    registeredFullName: storedRegisteredFullName,
    metadataName:
      typeof authUser.user_metadata?.full_name === 'string' ? authUser.user_metadata.full_name : undefined,
    email: realEmail(authUser.email) ?? profile.email ?? undefined,
    currentName: profile.full_name,
  });

  if (!better || better === profile.full_name) return null;

  const { error } = await supabase.from('users').update({ full_name: better }).eq('id', profile.id);
  if (error) {
    console.warn('repairProfileNameIfNeeded failed:', error.message);
    return null;
  }

  return better;
}
