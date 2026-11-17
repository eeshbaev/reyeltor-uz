import { isDemoId } from '@/lib/demo';
import { getDeviceId } from '@/lib/device';
import { supabase } from '@/lib/supabase';

export type ListingEventType = 'view' | 'contact_call' | 'contact_message' | 'share';

/**
 * Records audience interest for a listing (supabase/patch-seller-tools-v1.sql).
 * The server ignores repeats within 30 minutes, the owner's own activity, and inactive listings.
 * Fire-and-forget: never blocks or breaks the UI.
 */
export async function recordListingEvent(listingId: string, event: ListingEventType): Promise<void> {
  if (!listingId || isDemoId(listingId)) return;
  try {
    const viewerKey = await getDeviceId();
    const { error } = await supabase.rpc('record_listing_event', {
      p_listing_id: listingId,
      p_event: event,
      p_viewer_key: viewerKey,
    });
    if (error && event === 'view') {
      // Seller-tools patch not applied yet: keep the old view counter working.
      await supabase.rpc('increment_listing_view', { p_listing_id: listingId });
    }
  } catch (error) {
    console.warn('recordListingEvent failed:', error);
  }
}

export interface ListingPerformance {
  views: number;
  unique_viewers: number;
  views_7d: number;
  web_views: number;
  contact_taps: number;
  contacts_7d: number;
  shares: number;
  favorites: number;
  favorites_7d: number;
  days_published: number;
  tracking_since: string | null;
}

export async function fetchListingPerformance(listingId: string): Promise<ListingPerformance | null> {
  const { data, error } = await supabase.rpc('get_listing_performance', { p_listing_id: listingId });
  if (error) {
    console.warn('get_listing_performance failed:', error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as ListingPerformance | undefined;
  return row ?? null;
}

export type PerformanceInsight = 'attention' | 'lowViews' | 'viewsNoContacts' | 'phoneHidden' | 'fewPhotos';

/**
 * Deterministic tips from real numbers. They describe what the data shows;
 * they never promise that an action will lead to a sale or rental.
 */
export function performanceInsights(
  perf: ListingPerformance,
  context: { photoCount: number; phoneVisible: boolean },
): PerformanceInsight[] {
  const tips: PerformanceInsight[] = [];
  if (!context.phoneVisible) tips.push('phoneHidden');
  if (perf.favorites_7d >= 3 || perf.contacts_7d >= 3) tips.push('attention');
  if (perf.days_published >= 5 && perf.views_7d < 10) tips.push('lowViews');
  if (perf.views >= 40 && perf.contact_taps === 0) tips.push('viewsNoContacts');
  if (context.photoCount < 4) tips.push('fewPhotos');
  return tips;
}
