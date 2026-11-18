/** Price-drop alerts for favorites (pure, unit-tested in supabase/tests/price-drop.test.mjs). */
export type PriceDropLocale = 'uz' | 'ru' | 'en' | 'zh' | 'tr';

export interface PriceDropRow {
  user_id: string;
  listing_id: string;
  old_price: number | string;
  new_price: number | string;
  listing_district: string | null;
  listing_type: string | null;
  locale: string | null;
  favorites_enabled: boolean | null;
}

const CURRENCY: Record<PriceDropLocale, string> = { uz: "soʻm", ru: 'сум', en: 'UZS', zh: '苏姆', tr: 'UZS' };

/** 41400000 → "41 400 000" (thin, non-breaking grouping like the app). */
export function formatUzs(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function dropPercent(oldPrice: number, newPrice: number): number {
  if (!(oldPrice > 0)) return 0;
  return Math.max(1, Math.round(((oldPrice - newPrice) / oldPrice) * 100));
}

export function getPriceDropCopy(row: PriceDropRow): { title: string; body: string } {
  const locale = ((row.locale ?? 'uz').split('-')[0] as PriceDropLocale) in CURRENCY
    ? ((row.locale ?? 'uz').split('-')[0] as PriceDropLocale)
    : 'uz';
  const oldPrice = Number(row.old_price);
  const newPrice = Number(row.new_price);
  const pct = dropPercent(oldPrice, newPrice);
  const prices = `${formatUzs(oldPrice)} → ${formatUzs(newPrice)} ${CURRENCY[locale]}`;
  const place = row.listing_district ? `${row.listing_district}: ` : '';
  switch (locale) {
    case 'ru':
      return { title: `Цена снизилась на ${pct}%`, body: `${place}${prices}. Объявление из избранного — нажмите, чтобы открыть.` };
    case 'en':
      return { title: `Price dropped ${pct}%`, body: `${place}${prices}. A listing you saved is now cheaper — tap to view.` };
    case 'zh':
      return { title: `价格下降 ${pct}%`, body: `${place}${prices}。您收藏的房源降价了，点击查看。` };
    case 'tr':
      return { title: `Fiyat %${pct} düştü`, body: `${place}${prices}. Kaydettiğiniz ilan ucuzladı — görmek için dokunun.` };
    default:
      return { title: `Narx ${pct}% ga tushdi`, body: `${place}${prices}. Sevimli eʼloningiz arzonladi — koʻrish uchun bosing.` };
  }
}

/** Payload consumed by lib/notifications/routing.ts (opens the listing). */
export function priceDropPushData(row: PriceDropRow): Record<string, string> {
  return { category: 'favorites', kind: 'priceDrop', route: '/listing/[id]', listingId: row.listing_id };
}
