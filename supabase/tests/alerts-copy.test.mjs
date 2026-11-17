// node --experimental-strip-types supabase/tests/alerts-copy.test.mjs
import { dropPercent, formatUzs, getPriceDropCopy, priceDropPushData } from '../functions/_shared/priceDropPush.ts';
import { getSearchPushCopy } from '../functions/_shared/searchPush.ts';
import { planInstant } from '../functions/saved-search-alerts/plan.ts';

let fail = 0;
const ok = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fail++; };

ok(formatUzs(41400000) === '41 400 000', 'UZS grouping');
ok(dropPercent(1000, 960) === 4 && dropPercent(1000, 999) === 1 && dropPercent(0, 5) === 0, 'percent rounding');
const row = { user_id: 'U', listing_id: 'L', old_price: '45000000', new_price: 41400000, listing_district: 'Mirobod', listing_type: 'rent', locale: 'ru', favorites_enabled: true };
const ru = getPriceDropCopy(row);
ok(ru.title === 'Цена снизилась на 8%' && ru.body.startsWith('Mirobod: 45 000 000 → 41 400 000 сум'), `ru copy: ${ru.title} | ${ru.body}`);
ok(getPriceDropCopy({ ...row, locale: 'uz' }).title === 'Narx 8% ga tushdi', 'uz copy');
ok(getPriceDropCopy({ ...row, locale: 'xx' }).title.startsWith('Narx'), 'unknown locale falls back to Uzbek');
ok(getPriceDropCopy({ ...row, listing_district: null, locale: 'en' }).body.startsWith('45'), 'no district prefix when missing');
const data = priceDropPushData(row);
ok(data.route === '/listing/[id]' && data.listingId === 'L' && data.category === 'favorites', 'tapping opens the listing');

const last = getSearchPushCopy('single', 'en', { name: 'Rent · Mirobod', district: 'Mirobod', count: 1 }, 'last');
ok(last.title === 'New for your last search' && last.body.includes('Rent · Mirobod'), 'last-search copy');
ok(getSearchPushCopy('single', 'en', { name: 'X', district: 'Y', count: 1 }).title.startsWith('New match'), 'saved-search copy unchanged');
ok(getSearchPushCopy('digest', 'en', { count: 3 }, 'last').title === 'Your matches today', 'digest stays generic');

const plan = planInstant(
  [{ match_id: '1', search_id: 's', search_name: 'Rent', search_kind: 'last', user_id: 'U', listing_id: 'L', listing_district: 'Mirobod', locale: 'en' }],
  new Map(),
  new Set(['U']),
);
ok(plan.pushes[0].searchKind === 'last', 'plan keeps the search kind');
const old = planInstant([{ match_id: '1', search_id: 's', search_name: 'Rent', user_id: 'U', listing_id: 'L', listing_district: 'Mirobod', locale: 'en' }], new Map(), new Set(['U']));
ok(old.pushes[0].searchKind === 'saved', 'older database rows default to saved');

console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
