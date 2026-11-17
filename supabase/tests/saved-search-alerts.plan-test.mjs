// node --experimental-strip-types supabase/tests/saved-search-alerts.plan-test.mjs
import { planInstant, planDigest, tashkentDayStartUtc, pushData } from '../functions/saved-search-alerts/plan.ts';
import { getSearchPushCopy } from '../functions/_shared/searchPush.ts';

let fail = 0;
const ok = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fail++; };
const row = (id, user, search, listing = 'L' + id) => ({ match_id: id, user_id: user, search_id: search, search_name: 'S-' + search, listing_id: listing, listing_district: 'Mirobod', locale: 'ru' });

// U1 has 3 searches; one search with 2 new matches; already 3 pushes today -> cap 5 leaves 2
const rows = [row('1', 'U1', 'a'), row('2', 'U1', 'a'), row('3', 'U1', 'b'), row('4', 'U1', 'c'), row('5', 'U2', 'd'), row('6', 'U3', 'e')];
const plan = planInstant(rows, new Map([['U1', 3]]), new Set(['U1', 'U2']));
const u1 = plan.pushes.filter((p) => p.userId === 'U1');
ok(u1.length === 2, 'cap: U1 gets only 2 more pushes (3 already today, cap 5)');
ok(u1[0].kind === 'multiple' && u1[0].count === 2 && !u1[0].listingId, 'two matches for one search bundled into one push');
ok(u1[1].kind === 'single' && u1[1].listingId === 'L3', 'single match push opens the listing');
ok(plan.deferToDigest.join() === '4', 'over-cap match deferred to digest (not dropped)');
ok(plan.skip.join() === '6', 'user without devices skipped');
ok(plan.pushes.some((p) => p.userId === 'U2'), 'other user unaffected by U1 cap');

const digest = planDigest([row('7', 'U1', 'a', 'X'), row('8', 'U1', 'b', 'X'), row('9', 'U1', 'b', 'Y'), row('10', 'U4', 'z')], new Set(['U1']));
ok(digest.pushes.length === 1 && digest.pushes[0].count === 2 && digest.pushes[0].matchIds.length === 3, 'digest: one push per user, counts distinct listings');
ok(digest.skip.join() === '10', 'digest skips users without devices');

const start = tashkentDayStartUtc(new Date('2026-11-10T18:59:00Z')); // 23:59 Tashkent
ok(start.toISOString() === '2026-11-09T19:00:00.000Z', 'Tashkent day start (late evening)');
ok(tashkentDayStartUtc(new Date('2026-11-10T19:01:00Z')).toISOString() === '2026-11-10T19:00:00.000Z', 'Tashkent day start (just after midnight)');

ok(pushData(u1[1]).route === '/listing/[id]' && pushData(u1[0]).route === '/(tabs)/favorites?tab=searches', 'push routes');
const c = getSearchPushCopy('multiple', 'uz-UZ', { name: 'Ofis', count: 3 });
ok(c.title.includes('Ofis') && c.body.includes('3'), 'localized copy interpolates (uz)');
ok(getSearchPushCopy('single', 'xx', { name: 'A', district: 'Mirobod' }).body.includes('Mirobod'), 'unknown locale falls back');
console.log(fail ? `${fail} failed` : 'all passed');
process.exit(fail ? 1 : 0);
