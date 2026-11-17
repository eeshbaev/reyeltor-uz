import type { Href } from 'expo-router';
import { looksLikePhoneNumber } from '@/lib/auth/displayName';
import { REGISTRATION_WELCOME_ROUTE } from '@/lib/onboarding/constants';
import { getPendingWelcomeName, getRegisteredFullName, isWelcomeShown } from '@/lib/onboarding/storage';

function pickWelcomeRouteName(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || looksLikePhoneNumber(trimmed)) continue;
    return trimmed;
  }
  return undefined;
}

export async function resolvePostAuthRoute(fullName?: string, userId?: string): Promise<Href> {
  const shown = await isWelcomeShown();
  if (shown) return '/(tabs)/map';

  const pendingName = await getPendingWelcomeName();
  const registeredName = userId ? await getRegisteredFullName(userId) : undefined;
  const safeName = pickWelcomeRouteName(fullName, pendingName, registeredName);
  return safeName
    ? { pathname: REGISTRATION_WELCOME_ROUTE, params: { name: safeName, mode: 'first' } }
    : { pathname: REGISTRATION_WELCOME_ROUTE, params: { mode: 'first' } };
}

/** After an explicit sign-in — always show a welcome moment (first-time coins or welcome back). */
export async function resolvePostLoginRoute(fullName?: string, userId?: string): Promise<Href> {
  const shown = await isWelcomeShown();
  const pendingName = await getPendingWelcomeName();
  const registeredName = userId ? await getRegisteredFullName(userId) : undefined;
  const safeName = pickWelcomeRouteName(fullName, pendingName, registeredName);
  const mode = shown ? 'returning' : 'first';

  return safeName
    ? { pathname: REGISTRATION_WELCOME_ROUTE, params: { name: safeName, mode } }
    : { pathname: REGISTRATION_WELCOME_ROUTE, params: { mode } };
}

/** Optional post-welcome destination, e.g. favorites after guest heart sign-in. */
export function withWelcomeReturnTo(href: Href, returnTo: string): Href {
  if (typeof href === 'string') {
    // Typed routes cannot prove a dynamic pathname + extra param is valid; the route exists.
    return { pathname: href, params: { returnTo } } as Href;
  }

  return {
    pathname: href.pathname,
    params: { ...(href.params ?? {}), returnTo },
  } as Href;
}
