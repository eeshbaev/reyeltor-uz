import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { User } from '@/types';

/**
 * How access to Reyeltor-uz works today, and the single place future plans plug in.
 *
 * Today: early access, everything free, no payments (supabase/patch-access-v1.sql, row
 * app_settings.access). Rules for any future paid option:
 *   - Only new, optional extras may be gated (canUse below). Nothing that is free today
 *     becomes paid without an announcement in the app beforehand.
 *   - A person's own records are never gated: listings, favorites, saved searches,
 *     alerts history, coins and Early Member status stay theirs whatever the plan.
 *   - No payment code lives in the app until the owner decides to add it.
 */

export type AccessPhase = 'early_access' | 'general';
export type AccessPricing = 'free' | 'free_with_extras';

export interface AccessSettings {
  phase: AccessPhase;
  pricing: AccessPricing;
  /** New sign-ups become Early Members while this is true. No end date is set. */
  earlyAccessOpen: boolean;
}

export const DEFAULT_ACCESS: AccessSettings = {
  phase: 'early_access',
  pricing: 'free',
  earlyAccessOpen: true,
};

/** Everything the app does today. Every one of these is free. */
export type Feature =
  | 'map_search'
  | 'listing_details'
  | 'post_listing'
  | 'favorites'
  | 'saved_search_alerts'
  | 'price_drop_alerts'
  | 'property_tools'
  | 'seller_insights'
  | 'share_cards';

/** Feature gate for a possible future. Today it always answers yes. */
export function canUse(_feature: Feature, _access: AccessSettings = DEFAULT_ACCESS): boolean {
  return true;
}

export function isEarlyMember(profile: Pick<User, 'early_member_since'> | null | undefined): boolean {
  return Boolean(profile?.early_member_since);
}

function parseAccess(value: unknown): AccessSettings {
  if (!value || typeof value !== 'object') return DEFAULT_ACCESS;
  const v = value as Record<string, unknown>;
  return {
    phase: v.phase === 'general' ? 'general' : 'early_access',
    pricing: v.pricing === 'free_with_extras' ? 'free_with_extras' : 'free',
    earlyAccessOpen: typeof v.early_access_open === 'boolean' ? v.early_access_open : DEFAULT_ACCESS.earlyAccessOpen,
  };
}

let cached: AccessSettings | null = null;
let inflight: Promise<AccessSettings> | null = null;

export function fetchAccessSettings(): Promise<AccessSettings> {
  if (cached) return Promise.resolve(cached);
  if (!isSupabaseConfigured()) return Promise.resolve(DEFAULT_ACCESS);
  inflight ??= (async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'access').maybeSingle();
      // Before the database update is applied the table is missing: keep the defaults.
      cached = error || !data ? DEFAULT_ACCESS : parseAccess(data.value);
    } catch {
      cached = DEFAULT_ACCESS;
    }
    inflight = null;
    return cached;
  })();
  return inflight;
}

export function useAccessSettings(): AccessSettings {
  const [access, setAccess] = useState<AccessSettings>(cached ?? DEFAULT_ACCESS);
  useEffect(() => {
    let alive = true;
    void fetchAccessSettings().then((value) => {
      if (alive) setAccess(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return access;
}
