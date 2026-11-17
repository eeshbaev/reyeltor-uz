import {
  REFERRAL_FIRST_FAVORITE_COINS,
  REFERRAL_FIRST_POST_COINS,
  REFERRAL_REGISTER_COINS,
} from '@/lib/constants';
import { normalizeReferralCode } from '@/lib/growth/pendingReferral';
import { supabase } from '@/lib/supabase';

function generateReferralCode(fullName: string): string {
  const prefix = fullName
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${prefix}${suffix}`;
}

export async function getOrCreateReferralCode(userId: string, fullName: string): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.code) return existing.code;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateReferralCode(fullName);
      const { data, error } = await supabase
        .from('referral_codes')
        .insert({ user_id: userId, code })
        .select('code')
        .single();

      if (!error && data?.code) return data.code;
      if (error?.code !== '23505') break;
    }
  } catch (error) {
    console.warn('getOrCreateReferralCode failed:', error);
  }
  return null;
}

export async function applyReferralCode(userId: string, rawCode: string): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;

  try {
    const { data, error } = await supabase.rpc('apply_referral_code', {
      p_referred_id: userId,
      p_code: code,
    });

    if (error) {
      console.warn('apply_referral_code RPC failed:', error.message);
      return false;
    }

    return data === true || data === 'true';
  } catch (error) {
    console.warn('applyReferralCode failed:', error);
    return false;
  }
}

export async function processReferralFirstPost(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('process_referral_milestone', {
      p_user_id: userId,
      p_event: 'first_post',
      p_reward: REFERRAL_FIRST_POST_COINS,
    });
    if (error) console.warn('process_referral_first_post failed:', error.message);
  } catch (error) {
    console.warn('processReferralFirstPost failed:', error);
  }
}

export async function processReferralFirstFavorite(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('process_referral_milestone', {
      p_user_id: userId,
      p_event: 'first_favorite',
      p_reward: REFERRAL_FIRST_FAVORITE_COINS,
    });
    if (error) console.warn('process_referral_first_favorite failed:', error.message);
  } catch (error) {
    console.warn('processReferralFirstFavorite failed:', error);
  }
}

export { REFERRAL_REGISTER_COINS, REFERRAL_FIRST_POST_COINS, REFERRAL_FIRST_FAVORITE_COINS };
