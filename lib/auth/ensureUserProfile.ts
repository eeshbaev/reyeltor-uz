import type { User } from '@supabase/supabase-js';
import { WELCOME_COINS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export async function ensureUserProfile(user: User): Promise<boolean> {
  const { data: existing } = await supabase.from('users').select('id').eq('id', user.id).maybeSingle();
  if (existing) return true;

  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  const phone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';
  const email = user.email?.trim() ?? '';

  if (!fullName || !phone || !email) {
    return false;
  }

  const { error: profileError } = await supabase.from('users').upsert(
    {
      id: user.id,
      full_name: fullName,
      phone,
      email,
      coin_balance: WELCOME_COINS,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.warn('ensureUserProfile failed:', profileError.message);
    return false;
  }

  const { data: welcomeCoin } = await supabase
    .from('coin_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'welcome')
    .maybeSingle();

  if (!welcomeCoin) {
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      amount: WELCOME_COINS,
      type: 'welcome',
    });
  }

  return true;
}
