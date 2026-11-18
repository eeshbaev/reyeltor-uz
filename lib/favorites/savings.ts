import { supabase } from '@/lib/supabase';

/**
 * Accumulated value on the Favorites tab (manual H-04 / retention doc): how many saved homes
 * are cheaper now than when they were saved. Uses real price history only.
 */
export async function countCheaperSinceSaved(
  userId: string,
  currentPrices: Map<string, number>,
): Promise<number> {
  const { data: favorites } = await supabase.from('favorites').select('listing_id, saved_at').eq('user_id', userId);
  const saved = (favorites ?? []).filter((f) => currentPrices.has(f.listing_id) && f.saved_at);
  if (saved.length === 0) return 0;

  const { data: history } = await supabase
    .from('price_history')
    .select('listing_id, old_price, changed_at')
    .in('listing_id', saved.map((f) => f.listing_id))
    .order('changed_at', { ascending: true });

  let cheaper = 0;
  for (const fav of saved) {
    // The price when saved = the old price of the first change after saving.
    const firstChange = (history ?? []).find(
      (row) => row.listing_id === fav.listing_id && Date.parse(row.changed_at) >= Date.parse(fav.saved_at),
    );
    const now = currentPrices.get(fav.listing_id);
    if (firstChange && now != null && now < Number(firstChange.old_price)) cheaper += 1;
  }
  return cheaper;
}
