import type { TFunction } from 'i18next';
import { PLAY_STORE_URL } from '@/lib/constants';
import { isDemoId } from '@/lib/demo';
import { getListingCategory } from '@/lib/listing';
import { getListingWebUrl } from '@/lib/listingLinks';
import type { ListingWithPhotos, PriceHistoryEntry, User } from '@/types';

export interface ListingShareContext {
  priceDropPercent?: number | null;
  saveCount?: number | null;
}

export function computePriceDropPercent(history: PriceHistoryEntry[]): number | null {
  if (history.length === 0) return null;
  const latest = history[0];
  if (latest.new_price >= latest.old_price) return null;
  return Math.round(((latest.old_price - latest.new_price) / latest.old_price) * 100);
}

export function buildListingShareText(
  listing: ListingWithPhotos,
  formatPrice: (price: number) => string,
  t: TFunction,
  context: ListingShareContext = {},
): string {
  const category = getListingCategory(listing);
  const typeKey =
    listing.type === 'rent'
      ? 'filters.rent'
      : listing.type === 'lease'
        ? 'filters.lease'
        : 'filters.sale';

  const lines: string[] = [];
  const headlineParts: string[] = [];

  if (listing.rooms > 0) {
    headlineParts.push(`${listing.rooms} ${t('common.rooms')}`);
  }
  headlineParts.push(`${listing.area_m2} ${t('common.area')}`);
  headlineParts.push(listing.district);

  lines.push(`🏠 ${headlineParts.join(' · ')}`);
  lines.push(`💰 ${formatPrice(listing.price)} · ${t(typeKey)}`);

  if (category === 'commercial' && listing.property_type) {
    lines.push(`🏢 ${listing.property_type}`);
  }

  if (context.priceDropPercent && context.priceDropPercent > 0) {
    lines.push(t('growth.priceDropLine', { percent: context.priceDropPercent }));
  }

  if (context.saveCount != null && context.saveCount >= 3) {
    lines.push(t('growth.savedByCount', { count: context.saveCount }));
  }

  const agent = listing.users;
  if (agent?.full_name && agent.close_rate != null && agent.close_rate > 0) {
    lines.push(
      t('growth.agentLine', {
        name: agent.full_name,
        rate: Math.round(agent.close_rate),
      }),
    );
  }

  // Demo listings exist only inside the app, so they never get a public link.
  if (!isDemoId(listing.id)) {
    lines.push(`🔗 ${getListingWebUrl(listing.id)}`);
  }

  lines.push('');
  lines.push(t('growth.shareCta'));
  lines.push(PLAY_STORE_URL);

  return lines.join('\n');
}

export function buildAgentShareText(
  agent: Pick<User, 'full_name' | 'close_rate' | 'total_posted' | 'total_rented' | 'total_sold'>,
  activeCount: number,
  t: TFunction,
): string {
  const lines = [
    `👤 ${agent.full_name}`,
    t('growth.agentStatsLine', {
      closeRate: Math.round(agent.close_rate ?? 0),
      active: activeCount,
      posted: agent.total_posted,
    }),
    '',
    t('growth.agentShareCta'),
    PLAY_STORE_URL,
  ];
  return lines.join('\n');
}

export function buildReferralShareText(code: string, t: TFunction): string {
  return [
    t('growth.referralIntro'),
    '',
    t('growth.referralCodeLine', { code }),
    PLAY_STORE_URL,
  ].join('\n');
}

export function buildToolShareSummary(title: string, summaryLines: string[], t: TFunction): string {
  return [`📊 ${title}`, ...summaryLines, '', t('growth.toolShareCta'), PLAY_STORE_URL].join('\n');
}
