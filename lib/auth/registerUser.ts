import type { Session, User } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import { withAuthTimeout } from '@/lib/auth/timeouts';
import {
  formatAuthErrorMessage,
  formatPostgrestErrorMessage,
  type MappedRegisterError,
  mapRegisterErrorMessage,
} from '@/lib/auth/errors';
import { WELCOME_COINS } from '@/lib/constants';
import { isRegisterUserInputValid } from '@/lib/validation';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface RegisterUserInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export type RegisterUserResult =
  | { status: 'success'; session: Session; userId: string }
  | { status: 'confirm_email'; email: string }
  | {
      status: 'error';
      code: 'not_configured' | 'timeout' | 'failed';
      error?: MappedRegisterError;
      message?: string;
    };

export async function registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
  if (!isRegisterUserInputValid(input)) {
    return { status: 'error', code: 'failed' };
  }

  if (!isSupabaseConfigured()) {
    return { status: 'error', code: 'not_configured' };
  }

  try {
    const { data: authData, error: authError } = await withAuthTimeout(
      supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            phone: input.phone,
          },
        },
      }),
    );

    if (authError) {
      const message = formatAuthErrorMessage(authError);
      console.warn('Registration auth error:', authError);
      return {
        status: 'error',
        code: 'failed',
        error: mapRegisterErrorMessage(message || 'Registration failed'),
        message: message || undefined,
      };
    }

    const user = authData.user;
    if (!user) {
      return { status: 'error', code: 'failed' };
    }

    if (!authData.session) {
      return { status: 'confirm_email', email: input.email.trim() };
    }

    const profileError = await createUserProfile(user, input);
    if (profileError) {
      const message = formatPostgrestErrorMessage(profileError);
      console.warn('Registration profile error:', profileError);
      return {
        status: 'error',
        code: 'failed',
        error: mapRegisterErrorMessage(message || 'Profile creation failed'),
        message: message || undefined,
      };
    }

    return { status: 'success', session: authData.session, userId: user.id };
  } catch (error) {
    console.warn('Registration unexpected error:', error);
    if (error instanceof Error && error.message === 'AUTH_TIMEOUT') {
      return { status: 'error', code: 'timeout' };
    }
    const message = error instanceof Error ? error.message : '';
    return {
      status: 'error',
      code: 'failed',
      error: mapRegisterErrorMessage(message || 'Registration failed'),
      message: message || undefined,
    };
  }
}

async function createUserProfile(user: User, input: RegisterUserInput): Promise<PostgrestError | null> {
  const { error: profileError } = await withAuthTimeout(
    Promise.resolve(
      supabase.from('users').upsert(
        {
          id: user.id,
          full_name: input.fullName.trim(),
          phone: input.phone,
          email: input.email.trim(),
          coin_balance: WELCOME_COINS,
        },
        { onConflict: 'id' },
      ),
    ),
  );

  if (profileError) {
    return profileError;
  }

  const { data: existingWelcome } = await supabase
    .from('coin_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'welcome')
    .maybeSingle();

  if (existingWelcome) {
    return null;
  }

  const { error: coinError } = await withAuthTimeout(
    Promise.resolve(
      supabase.from('coin_transactions').insert({
        user_id: user.id,
        amount: WELCOME_COINS,
        type: 'welcome',
      }),
    ),
  );

  if (coinError) {
    console.warn('Welcome coin transaction failed:', coinError.message);
  }

  return null;
}
