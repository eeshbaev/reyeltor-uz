import { requestCacheMedium } from '@/lib/cache/requestCache';
import { MIN_SAVE_COUNT_FOR_BADGE } from '@/lib/constants';
import { isDemoId } from '@/lib/demo';
import { computePriceDropPercent } from '@/lib/growth/shareMessage';
import { supabase } from '@/lib/supabase';
import type { PriceHistoryEntry } from '@/types';

export interface ListingEngagement {
  saveCount: number;
  priceDropPercent: number | null;
}

export async function fetchListingEngagement(listingId: string): Promise<ListingEngagement | null> {
  if (isDemoId(listingId) || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return null;
  }

  try {
    return await requestCacheMedium.get(`engagement_${listingId}`, async () => {
      const { data, error } = await supabase
        .from('listing_engagement_stats')
        .select('save_count, price_drop_percent')
        .eq('listing_id', listingId)
        .maybeSingle();

      if (error || !data) {
        return { saveCount: 0, priceDropPercent: null };
      }

      return {
        saveCount: data.save_count ?? 0,
        priceDropPercent: data.price_drop_percent ?? null,
      };
    });
  } catch {
    return null;
  }
}

export function engagementFromPriceHistory(history: PriceHistoryEntry[]): ListingEngagement {
  return {
    saveCount: 0,
    priceDropPercent: computePriceDropPercent(history),
  };
}

export function shouldShowSaveBadge(saveCount: number): boolean {
  return saveCount >= MIN_SAVE_COUNT_FOR_BADGE;
}

export function shouldShowPriceDropBadge(priceDropPercent: number | null): boolean {
  return priceDropPercent != null && priceDropPercent > 0;
}
