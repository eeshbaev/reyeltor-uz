/**
 * Demo inventory visibility.
 *
 * Set EXPO_PUBLIC_DEMO_INVENTORY in .env / EAS env:
 *   auto (default) — per district: top up thin districts with labeled demo listings so each
 *                    shows about DEMO_TARGET_PER_DISTRICT listings (real + demo). Districts with
 *                    DEMO_MIN_REAL_PER_DISTRICT or more real listings show real listings only.
 *   on             — always show all demo listings (development, stress tests, investor demos).
 *   off            — never show demo listings (real inventory only).
 *
 * Demo listings are bundled in the app and never stored in Supabase, so they can never
 * trigger saved-search alerts, coin charges, seller statistics or reviews.
 */
import type { ListingWithPhotos } from '@/types';

export type DemoInventoryMode = 'auto' | 'on' | 'off';

/** A district "has supply" once it has this many real active listings. Tune as the market grows. */
export const DEMO_MIN_REAL_PER_DISTRICT = 15;

/**
 * In auto mode a thin district is topped up to this many listings. 12 districts x 5 = 60 demo
 * listings citywide while there is no real supply: enough to look alive, not crowded.
 */
export const DEMO_TARGET_PER_DISTRICT = 5;

/** Demo listings shown citywide while there is no real supply (spread evenly over districts). */
export const DEMO_TOTAL_TARGET = 60;

function parseMode(value: string | undefined): DemoInventoryMode {
  const normalized = value?.trim().toLowerCase();
  return normalized === 'on' || normalized === 'off' ? normalized : 'auto';
}

export const DEMO_INVENTORY_MODE: DemoInventoryMode = parseMode(process.env.EXPO_PUBLIC_DEMO_INVENTORY);

/**
 * Picks which demo listings to show next to the real ones.
 * In 'auto' mode, a district keeps its demos only while its real supply is thin.
 */
export function selectDemoListings<T extends Pick<ListingWithPhotos, 'district'> & Partial<Pick<ListingWithPhotos, 'category' | 'type' | 'property_type'>>>(
  real: Array<Pick<ListingWithPhotos, 'district'>>,
  demos: T[],
  mode: DemoInventoryMode = DEMO_INVENTORY_MODE,
  minRealPerDistrict = DEMO_MIN_REAL_PER_DISTRICT,
  targetPerDistrict?: number,
): T[] {
  if (mode === 'off') return [];
  if (mode === 'on') return demos;

  const realPerDistrict = new Map<string, number>();
  for (const listing of real) {
    realPerDistrict.set(listing.district, (realPerDistrict.get(listing.district) ?? 0) + 1);
  }

  // Group each district's demos by property kind (apartment, house, office, shop, warehouse...)
  // and alternate rent/sale inside each kind, so the few we keep are a varied mix.
  const byDistrict = new Map<string, Map<string, T[]>>();
  for (const demo of demos) {
    const kinds = byDistrict.get(demo.district) ?? new Map<string, T[]>();
    const kind = `${demo.category ?? ''}:${demo.property_type ?? ''}`;
    kinds.set(kind, [...(kinds.get(kind) ?? []), demo]);
    byDistrict.set(demo.district, kinds);
  }

  // 60 demos over N districts: every district gets floor(60 / N), the first ones one more.
  const allDistricts = [...byDistrict.keys()].sort((a, b) => a.localeCompare(b));
  const base = Math.floor(DEMO_TOTAL_TARGET / Math.max(1, allDistricts.length));
  const extra = DEMO_TOTAL_TARGET % Math.max(1, allDistricts.length);
  const targetFor = (district: string) =>
    targetPerDistrict ?? Math.min(DEMO_TARGET_PER_DISTRICT, base + (allDistricts.indexOf(district) < extra ? 1 : 0));

  const kept: T[] = [];
  let districtIndex = 0;
  for (const [district, kinds] of [...byDistrict.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const realCount = realPerDistrict.get(district) ?? 0;
    if (realCount >= minRealPerDistrict) continue;
    let slots = Math.max(0, targetFor(district) - realCount);
    // Kinds alternate between starting with a rental and starting with a sale.
    const sortedKinds = [...kinds.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, list], kindIndex) => alternateTypes(list, (kindIndex + districtIndex) % 2 === 1));
    // Each district starts from a different kind, so the city as a whole shows every kind.
    const offset = sortedKinds.length ? districtIndex % sortedKinds.length : 0;
    const queues = [...sortedKinds.slice(offset), ...sortedKinds.slice(0, offset)];
    districtIndex++;
    for (let i = 0; slots > 0; i++) {
      let took = false;
      for (const queue of queues) {
        if (slots > 0 && i < queue.length) {
          kept.push(queue[i]);
          slots--;
          took = true;
        }
      }
      if (!took) break;
    }
  }
  return kept;
}

/** Reorders listings so rent/lease and sale alternate (rent, sale, ... or sale, rent, ...). */
function alternateTypes<T extends Partial<Pick<ListingWithPhotos, 'type'>>>(list: T[], saleFirst: boolean): T[] {
  const sale = list.filter((l) => l.type === 'buy');
  const other = list.filter((l) => l.type !== 'buy');
  const [first, second] = saleFirst ? [sale, other] : [other, sale];
  const mixed: T[] = [];
  for (let i = 0; i < Math.max(sale.length, other.length); i++) {
    if (first[i]) mixed.push(first[i]);
    if (second[i]) mixed.push(second[i]);
  }
  return mixed;
}
