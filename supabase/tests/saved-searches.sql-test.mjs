// Executes supabase/schema.sql + patch-saved-searches-v1.sql on an in-process Postgres
// (PGlite) with minimal Supabase stubs, then runs behavioral assertions.
//
//   npm install --no-save @electric-sql/pglite
//   node supabase/tests/saved-searches.sql-test.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite({ extensions: { pgcrypto } });

const stubs = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, encrypted_password text, banned_until timestamptz);
create schema extensions; create extension pgcrypto schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create schema storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create policy "public read (as in storage-setup.sql)" on storage.objects for select using (bucket_id = 'reyeltor-listings');
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
`;

let failures = 0;
let passes = 0;
function ok(cond, msg) {
  if (cond) { passes++; console.log('  PASS', msg); }
  else { failures++; console.log('  FAIL', msg); }
}
async function q(sql, params) { return (await db.query(sql, params)).rows; }
async function asUser(uid, fn) {
  await db.exec(`set test.uid = '${uid}'; set role authenticated;`);
  try { return await fn(); } finally { await db.exec(`reset role; set test.uid = '';`); }
}
async function expectError(fn, needle, msg) {
  try { await fn(); ok(false, `${msg} (no error raised)`); }
  catch (e) { ok(String(e.message).includes(needle), `${msg} -> ${e.message}`); }
}

await db.exec(stubs);
await db.exec(fs.readFileSync(`${ROOT}/schema.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-saved-searches-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-listing-integrity-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-seller-tools-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-seller-tools-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-privacy-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-privacy-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-freshness-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-freshness-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-hardening-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-hardening-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-telegram-auth-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-telegram-auth-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-alerts-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-alerts-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-ops-v1.sql`, 'utf8'));
await db.exec(fs.readFileSync(`${ROOT}/patch-ops-v1.sql`, 'utf8'));
console.log('schema + patches applied');
// Re-run safety
await db.exec(fs.readFileSync(`${ROOT}/patch-saved-searches-v1.sql`, 'utf8'));
// Later patches redefine some of its functions: re-apply them too, in bundle order.
for (const later of ['patch-hardening-v1.sql', 'patch-telegram-auth-v1.sql', 'patch-alerts-v1.sql', 'patch-ops-v1.sql']) {
  await db.exec(fs.readFileSync(`${ROOT}/${later}`, 'utf8'));
}
console.log('patch re-applied (idempotent)');

await db.exec(`
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
`);

const A = '11111111-1111-1111-1111-111111111111'; // poster
const B = '22222222-2222-2222-2222-222222222222'; // searcher
const C = '33333333-3333-3333-3333-333333333333'; // second searcher
for (const [id, email, phone] of [[A, 'a@x.uz', '+998901111111'], [B, 'b@x.uz', '+998902222222'], [C, 'c@x.uz', '+998903333333']]) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
    [id, email, JSON.stringify({ full_name: 'Test ' + email, phone, locale: 'ru' })]);
}

console.log('\n[1] Users / coins');
let r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === 15, 'new user starts with 15 coins (via handle_new_user)');
await asUser(A, () => q(`update users set coin_balance = 9999, close_rate = 100, bio = 'hello' where id = $1`, [A]));
r = await q(`select coin_balance, close_rate, bio from users where id = $1`, [A]);
ok(r[0].coin_balance === 15 && r[0].close_rate === null && r[0].bio === 'hello', 'client cannot change balance/stats but can change bio');
await asUser(A, () => q(`insert into users (id, full_name, phone, email, coin_balance) values ($1,'x','+998901111111','a@x.uz',500)
  on conflict (id) do update set coin_balance = excluded.coin_balance`, [A]));
r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === 15, 'upsert with coin_balance from client is ignored');
await asUser(A, () => q(`insert into coin_transactions (user_id, amount, type) values ($1, 1000, 'welcome')`, [A]));
r = await q(`select count(*)::int n from coin_transactions where user_id = $1 and amount = 1000`, [A]);
ok(r[0].n === 0, 'client-written ledger row is silently dropped');

console.log('\n[2] Listing publishing & charging');
const listingCols = `user_id, type, category, property_type, price, rooms, area_m2, district, lat, lng, description`;
async function postListing(uid, over = {}) {
  const v = { type: 'buy', category: 'commercial', property_type: 'office', price: 1_000_000_000, rooms: 0, area_m2: 100, district: 'Mirobod', lat: 41.3, lng: 69.27, description: 'Office near metro', ...over };
  return (await q(`insert into listings (${listingCols}, is_featured, view_count, expires_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, true, 999, now() + interval '10 years') returning *`,
    [uid, v.type, v.category, v.property_type, v.price, v.rooms, v.area_m2, v.district, v.lat, v.lng, v.description]))[0];
}
const first = await asUser(A, () => postListing(A));
ok(first.is_featured === false && first.view_count === 0, 'client cannot set featured / view_count on insert');
ok(new Date(first.expires_at) - Date.now() < 91 * 864e5, 'expiry forced to 90 days');
r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === 15, 'first listing is free');
await asUser(A, () => postListing(A));
r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === 10, 'second listing costs 5 (server-side)');
r = await q(`select amount, type from coin_transactions where user_id = $1 and type = 'post_cost'`, [A]);
ok(r.length === 1 && r[0].amount === -5, 'post_cost ledger row written by server');
await expectError(() => asUser(A, () => postListing(B)), 'listing_owner_mismatch', 'cannot post as another user');
await asUser(A, () => postListing(A)); // balance 5
await asUser(A, () => postListing(A)); // balance 0
await expectError(() => asUser(A, () => postListing(A)), 'insufficient_coins', 'posting blocked when balance too low');
r = await q(`select count(*)::int n from listings where user_id = $1`, [A]);
ok(r[0].n === 4, 'failed insert left no listing behind (atomic)');

console.log('\n[3] Listing updates');
await asUser(A, () => q(`update listings set view_count = 5000, is_featured = true, price = 900000000 where id = $1`, [first.id]));
r = await q(`select view_count, is_featured, price from listings where id = $1`, [first.id]);
ok(r[0].view_count === 0 && r[0].is_featured === false && r[0].price === 900000000, 'owner can edit price but not views/featured');
await asUser(B, () => q(`select increment_listing_view($1)`, [first.id]));
r = await q(`select view_count from listings where id = $1`, [first.id]);
ok(r[0].view_count === 1, 'increment_listing_view RPC counts a view');
await asUser(A, () => q(`update listings set status='archived', archived_reason='sold', archived_at=now() where id = $1`, [first.id]));
r = await q(`select status, total_sold from listings join users on users.id = listings.user_id where listings.id = $1`, [first.id]);
ok(r[0].status === 'archived' && r[0].total_sold === 1, 'archive works and stats trigger updates total_sold');
await q(`update users set coin_balance = 3 where id = $1`, [A]); // admin top-up (trusted)
await expectError(() => asUser(A, () => q(`update listings set status='active' where id = $1`, [first.id])), 'insufficient_coins', 'reactivation charged server-side (3 coins < cost)');
await q(`update users set coin_balance = 50 where id = $1`, [A]);
await asUser(A, () => q(`update listings set status='active' where id = $1`, [first.id]));
r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === 45, 'reactivation costs 5 with 3 other active listings');

console.log('\n[4] Check-ins');
const tz = (await q(`select (now() at time zone 'Asia/Tashkent')::date d, extract(dow from (now() at time zone 'Asia/Tashkent')::date)::int dow`))[0];
const isCheckinDay = [2, 4, 6].includes(tz.dow);
const before = (await q(`select coin_balance from users where id = $1`, [B]))[0].coin_balance;
if (isCheckinDay) {
  await asUser(B, () => q(`insert into checkin_log (user_id, checked_in_on) values ($1, (now() at time zone 'Asia/Tashkent')::date)`, [B]));
  r = await q(`select coin_balance from users where id = $1`, [B]);
  ok(r[0].coin_balance === before + 1, 'check-in awards exactly +1 server-side');
  await expectError(() => asUser(B, () => q(`insert into checkin_log (user_id, checked_in_on) values ($1, (now() at time zone 'Asia/Tashkent')::date - 1)`, [B])), 'checkin_already_claimed', 'cannot double-claim with yesterday’s date');
} else {
  await expectError(() => asUser(B, () => q(`insert into checkin_log (user_id, checked_in_on) values ($1, (now() at time zone 'Asia/Tashkent')::date)`, [B])), 'checkin_not_available_today', `check-in refused on non check-in day (dow=${tz.dow})`);
}
await expectError(() => asUser(B, () => q(`insert into checkin_log (user_id, checked_in_on) values ($1, '2020-01-01')`, [B])), 'checkin_invalid_date', 'old dates rejected');
r = await asUser(B, () => q(`delete from checkin_log where user_id = $1 returning id`, [B]));
ok(r.length === 0, 'client cannot delete check-in history (no re-claim farming)');

console.log('\n[5] Referral reward amount is fixed server-side');
await q(`update users set referred_by = $1 where id = $2`, [A, C]);
const aBefore = (await q(`select coin_balance from users where id = $1`, [A]))[0].coin_balance;
await asUser(C, () => q(`select process_referral_milestone($1, 'first_favorite', 100000)`, [C]));
r = await q(`select coin_balance from users where id = $1`, [A]);
ok(r[0].coin_balance === aBefore + 1, 'client-supplied reward ignored (awarded 1, not 100000)');

console.log('\n[6] Saved searches');
const commercialSale = { category: 'commercial', residentialTransaction: null, commercialTransaction: 'sale', priceCurrency: 'USD', priceMin: '50 000', priceMax: '100000', roomsMin: null, bathroomsMin: null, areaMin: '50', areaMax: '150', propertyType: null, yearBuiltMin: '', yearBuiltMax: '', views: [], level: null, listedSinceDays: null, keywords: '', districts: ['Mirobod', 'Yunusobod'], mapArea: null };
const rentFlat = { ...commercialSale, category: 'residential', commercialTransaction: null, residentialTransaction: 'rent', priceCurrency: 'UZS', priceMin: '', priceMax: '8000000', areaMin: '', areaMax: '', roomsMin: 2, districts: ['Mirobod'] };
const drawn = { ...rentFlat, mapArea: { points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 1, lng: 2 }] } };
const s1 = (await asUser(B, () => q(`insert into saved_searches (user_id, name, filters) values ($1, '  Commercial investment  ', $2) returning *`, [B, JSON.stringify(commercialSale)])))[0];
ok(s1.name === 'Commercial investment', 'name trimmed');
const s2 = (await asUser(B, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'Flat to rent', $2) returning *`, [B, JSON.stringify(rentFlat)])))[0];
const s3 = (await asUser(C, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'Drawn area', $2) returning *`, [C, JSON.stringify(drawn)])))[0];
const s4 = (await asUser(C, () => q(`insert into saved_searches (user_id, name, filters, notify_enabled) values ($1, 'Muted', $2, false) returning *`, [C, JSON.stringify(commercialSale)])))[0];
const s5 = (await asUser(A, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'Own', $2) returning *`, [A, JSON.stringify(commercialSale)])))[0];
r = await asUser(C, () => q(`select id from saved_searches`));
ok(r.length === 2 && r.every((x) => [s3.id, s4.id].includes(x.id)), 'RLS: users only see their own saved searches');
r = await asUser(C, () => q(`update saved_searches set notify_enabled = false where id = $1 returning id`, [s1.id]));
ok(r.length === 0, 'RLS: cannot modify another user’s search');
for (let i = 0; i < 8; i++) await asUser(B, () => q(`insert into saved_searches (user_id, name, filters) values ($1, $2, $3)`, [B, 'S' + i, JSON.stringify(rentFlat)]));
await expectError(() => asUser(B, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'eleventh', $2)`, [B, JSON.stringify(rentFlat)])), 'saved_search_limit', '11th saved search rejected (max 10)');
await q(`delete from saved_searches where user_id = $1 and name like 'S%'`, [B]);
await expectError(() => asUser(B, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'bad', '{"category":"land"}')`, [B])), 'check', 'invalid category rejected');

console.log('\n[7] Matcher');
await q(`update fx_rates set uzs_per_unit = 12500 where currency = 'USD'`);
await q(`update users set coin_balance = 500 where id = $1`, [A]);
// Make A's existing listings look old/already processed
await q(`update listings set search_matched_at = now()`);
const match1 = await asUser(A, () => postListing(A, { price: 75000 * 12500, area_m2: 120, district: 'Mirobod' }));   // matches s1
const noArea = await asUser(A, () => postListing(A, { price: 75000 * 12500, area_m2: 300, district: 'Mirobod' }));  // area too big
const wrongDistrict = await asUser(A, () => postListing(A, { price: 75000 * 12500, area_m2: 100, district: 'Sergeli' }));
const lease = await asUser(A, () => postListing(A, { type: 'lease', price: 75000 * 12500, area_m2: 100 }));          // wrong transaction
const flat = await asUser(A, () => postListing(A, { type: 'rent', category: 'residential', property_type: 'apartment', rooms: 2, price: 7_000_000, area_m2: 60, district: 'Mirobod', description: 'Bright flat' })); // matches s2
const tooFresh = await asUser(A, () => postListing(A, { price: 75000 * 12500, area_m2: 120 }));
// Age everything except tooFresh past the 2-minute window; give match1 + flat photos, others 31 min old
await q(`update listings set posted_at = now() - interval '5 minutes' where id = any($1)`, [[match1.id, flat.id]]);
await q(`update listings set posted_at = now() - interval '31 minutes' where id = any($1)`, [[noArea.id, wrongDistrict.id, lease.id]]);
await q(`insert into listing_photos (listing_id, storage_path, order_index) values ($1,'p',0), ($2,'p',0)`, [match1.id, flat.id]);
const enq = (await q(`select enqueue_saved_search_matches() n`))[0].n;
const matches = await q(`select search_id, listing_id from saved_search_matches`);
const has = (s, l) => matches.some((m) => m.search_id === s && m.listing_id === l);
ok(has(s1.id, match1.id), 'commercial $50k–100k, 50–150 m², Mirobod → matched (USD converted at fx rate)');
ok(has(s2.id, flat.id), '2-room flat for rent under 8M UZS in Mirobod → matched');
ok(!matches.some((m) => [noArea.id, wrongDistrict.id, lease.id].includes(m.listing_id)), 'area / district / transaction mismatches excluded');
ok(!matches.some((m) => m.search_id === s3.id), 'drawn-area search not matched in V1');
ok(!matches.some((m) => m.search_id === s4.id), 'notify-disabled search not matched');
ok(!matches.some((m) => m.search_id === s5.id), 'poster never alerted about own listing');
ok(!matches.some((m) => m.listing_id === tooFresh.id), 'listing < 2 min old waits (photos still uploading)');
ok(enq === 2 && matches.length === 2, `exactly 2 matches recorded (got ${matches.length})`);
await q(`update listings set price = price - 1 where id = $1`, [match1.id]);
const enq2 = (await q(`select enqueue_saved_search_matches() n`))[0].n;
ok(enq2 === 0, 'editing a matched listing does not alert again');

console.log('\n[8] Delivery claims');
let claimed = await q(`select * from claim_saved_search_matches('instant')`);
ok(claimed.length === 2 && claimed.every((c) => c.locale === 'ru'), 'claim returns both with user locale');
claimed = await q(`select * from claim_saved_search_matches('instant')`);
ok(claimed.length === 0, 'already-claimed matches are not handed out twice');
await q(`update saved_search_matches set status = 'digest', claimed_at = null`);
await asUser(B, () => q(`update saved_searches set notify_enabled = false where id = $1`, [s2.id]));
claimed = await q(`select * from claim_saved_search_matches('digest')`);
ok(claimed.length === 1 && claimed[0].search_id === s1.id, 'disabled search is skipped at delivery time');
r = await q(`select status from saved_search_matches where search_id = $1`, [s2.id]);
ok(r[0].status === 'skipped', 'skipped match recorded');
await q(`update saved_search_matches set status = 'sending', claimed_at = now() - interval '20 minutes' where search_id = $1`, [s1.id]);
claimed = await q(`select * from claim_saved_search_matches('instant')`);
ok(claimed.length === 1, 'stuck delivery (crash) is recovered after 15 minutes');
r = await asUser(B, () => q(`select count(*)::int n from saved_search_matches`));
ok(r[0].n === 2, 'RLS: user can read own matches');
r = await asUser(C, () => q(`select count(*)::int n from saved_search_matches`));
ok(r[0].n === 0, 'RLS: other users cannot read them');
await asUser(B, () => q(`select mark_saved_search_seen($1)`, [s1.id]));
r = await q(`select seen_at from saved_search_matches where search_id = $1`, [s1.id]);
ok(r[0].seen_at !== null, 'mark_saved_search_seen works for owner');
await expectError(() => asUser(B, () => q(`select enqueue_saved_search_matches()`)), 'permission denied', 'app users cannot run the matcher');
await expectError(() => asUser(B, () => q(`select * from claim_saved_search_matches('instant')`)), 'permission denied', 'app users cannot claim deliveries');

console.log('\n[9] Reports (flags): signed-in, one per account, 3 distinct established accounts');
const victim = await asUser(A, () => postListing(A, { area_m2: 70 }));
const D = '44444444-4444-4444-4444-444444444444';
const E = '55555555-5555-5555-5555-555555555555';
for (const [id, email, phone] of [[D, 'd@x.uz', '+998904444444'], [E, 'e@x.uz', '+998905555555']]) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, email, JSON.stringify({ phone })]);
}
const flag = (uid, dev, asId = uid) => asUser(uid, () => q(`insert into flags (listing_id, user_id, reason, device_id) values ($1,$2,'duplicate',$3)`, [victim.id, asId, dev]));
await expectError(() => db.exec(`set role anon;`).then(() => q(`insert into flags (listing_id, user_id, reason, device_id) values ($1, null, 'duplicate', 'x')`, [victim.id])).finally(() => db.exec('reset role;')), 'flags', 'anonymous reports are rejected');
await expectError(() => flag(B, 'fake', C), 'row-level security', 'cannot report in another user’s name');
await flag(B, 'd1');
await expectError(() => flag(B, 'd2'), 'duplicate key', 'same account cannot report twice with a new device id');
await flag(C, 'd3');
await flag(D, 'd4');
r = await q(`select status from listings where id = $1`, [victim.id]);
ok(r[0].status === 'active', 'brand-new accounts (< 1 day) do not count toward auto-archive');
await q(`update users set created_at = now() - interval '2 days' where id in ($1, $2, $3)`, [B, C, D]);
await flag(E, 'd5');
r = await q(`select status from listings where id = $1`, [victim.id]);
ok(r[0].status === 'archived', '3+ distinct established accounts archive the listing');

console.log('\n[10] Duplicate detection (find_similar_own_listings)');
await q(`update users set coin_balance = 500 where id = $1`, [A]);
const base = await asUser(A, () => postListing(A, { type: 'rent', category: 'residential', property_type: 'apartment', rooms: 2, price: 7_000_000, area_m2: 60, lat: 41.3200, lng: 69.3000, district: 'Mirobod' }));
const similar = (over = {}) => {
  const v = { type: 'rent', category: 'residential', ptype: 'apartment', price: 7_300_000, area: 61, lat: 41.3203, lng: 69.3002, rooms: 2, ...over };
  return asUser(A, () => q(`select * from find_similar_own_listings($1::listing_type, $2, $3, $4, $5, $6, $7, $8::smallint)`, [v.type, v.category, v.ptype, v.price, v.area, v.lat, v.lng, v.rooms]));
};
r = await similar();
ok(r.length === 1 && r[0].id === base.id && r[0].distance_m < 60, `same flat ~40 m away, price +4%, area +1 → flagged (${r[0]?.distance_m?.toFixed(0)} m)`);
r = await similar({ rooms: 3 });
ok(r.length === 0, 'different room count → not a duplicate');
r = await similar({ area: 75 });
ok(r.length === 0, 'area 25% larger → not a duplicate');
r = await similar({ price: 9_000_000 });
ok(r.length === 0, 'price 29% higher → not a duplicate');
r = await similar({ lat: 41.3230 });
ok(r.length === 0, '~330 m away → not a duplicate');
r = await similar({ type: 'buy', price: 7_000_000 });
ok(r.length === 0, 'sale vs rent → not a duplicate');
r = await asUser(B, () => q(`select * from find_similar_own_listings('rent', 'residential', 'apartment', 7000000, 60, 41.3, 69.27, 2::smallint)`));
ok(r.length === 0, 'other users never see your listings as duplicates (own listings only)');
await asUser(A, () => q(`update listings set status='archived', archived_reason='manually_archived' where id = $1`, [base.id]));
r = await similar();
ok(r.length === 0, 'archived listings are not duplicates');
await db.exec('set role anon;');
try {
  await expectError(() => q(`select * from find_similar_own_listings('rent', 'residential', null, 1, 1, 0, 0)`), 'permission denied', 'anonymous callers cannot use it');
} finally {
  await db.exec('reset role;');
}

console.log('\n[11] Listing events and seller performance');
const perfListing = await asUser(A, () => postListing(A, { area_m2: 88, lat: 41.35, lng: 69.35 }));
const ev = (uid, type, key) => uid
  ? asUser(uid, () => q(`select record_listing_event($1, $2, $3) ok`, [perfListing.id, type, key]))
  : (async () => { await db.exec('set role anon;'); try { return await q(`select record_listing_event($1, $2, $3) ok`, [perfListing.id, type, key]); } finally { await db.exec('reset role;'); } })();
r = await ev(B, 'view', 'device-bbbbbbbb');
ok(r[0].ok === true, 'buyer view recorded');
r = await ev(B, 'view', 'device-bbbbbbbb');
ok(r[0].ok === false, 'same viewer within 30 minutes is not counted twice');
r = await ev(C, 'view', 'device-cccccccc');
r = await ev(null, 'web_view', 'web-anon-1234');
ok(r[0].ok === true, 'anonymous web page view recorded');
r = await ev(A, 'view', 'device-aaaaaaaa');
ok(r[0].ok === false, "owner's own views are not counted");
await ev(B, 'contact_call', 'device-bbbbbbbb');
await ev(null, 'share', 'web-anon-1234');
r = await ev(B, 'hack', 'device-bbbbbbbb');
ok(r[0].ok === false, 'unknown event types rejected');
r = await ev(B, 'view', 'x');
ok(r[0].ok === false, 'invalid viewer key rejected');
await asUser(B, () => q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [B, perfListing.id]));
const perf = (await asUser(A, () => q(`select * from get_listing_performance($1)`, [perfListing.id])))[0];
ok(perf.views === 3 && perf.unique_viewers === 3 && perf.web_views === 1, `views ${perf.views}, unique ${perf.unique_viewers}, web ${perf.web_views}`);
ok(perf.contact_taps === 1 && perf.shares === 1 && perf.favorites === 1 && perf.favorites_7d === 1, 'contact taps, shares and favorites counted');
ok(perf.days_published === 0 && perf.tracking_since !== null, 'days published and tracking start returned');
await expectError(() => asUser(B, () => q(`select * from get_listing_performance($1)`, [perfListing.id])), 'not_listing_owner', 'only the owner can read performance');
r = await asUser(B, () => q(`select count(*)::int n from listing_events`));
ok(r[0].n === 0, 'raw events are not readable by app users');
await expectError(() => asUser(B, () => q(`insert into listing_events (listing_id, event_type, viewer_key) values ($1, 'view', 'device-zzzzzzzz')`, [perfListing.id])), 'row-level security', 'raw events cannot be inserted directly');
await asUser(A, () => q(`update listings set status='archived', archived_reason='manually_archived' where id = $1`, [perfListing.id]));
r = await ev(C, 'contact_call', 'device-cccccccc');
ok(r[0].ok === false, 'no events for inactive listings');

console.log('\n[12] Profile privacy');
await db.exec(`grant select on public_profiles to anon, authenticated;`);
r = await asUser(B, () => q(`select id from users`));
ok(r.length === 1 && r[0].id === B, 'users table: each person reads only their own row');
r = await asUser(B, () => q(`select * from users where id = $1`, [B]));
ok(r[0].phone === '+998902222222' && r[0].coin_balance != null, 'own full profile (phone, coins) still readable');
await q(`update users set phone_visible = false where id = $1`, [A]);
r = await asUser(B, () => q(`select phone, phone_visible, full_name from public_profiles where id = $1`, [A]));
ok(r.length === 1 && r[0].phone === null && r[0].full_name, 'hidden phone is not exposed in public_profiles');
await q(`update users set phone_visible = true where id = $1`, [A]);
r = await asUser(B, () => q(`select phone from public_profiles where id = $1`, [A]));
ok(r[0].phone === '+998901111111', 'visible phone is shown');
r = await asUser(A, () => q(`select id from public_profiles where id = $1`, [C]));
ok(r.length === 0, 'people who never published a listing are not listed');
r = await asUser(B, () => q(`select * from public_profiles limit 1`));
ok(r.length === 1 && !('coin_balance' in r[0]) && !('referred_by' in r[0]) && !('purposes' in r[0]), 'no coin balance, referrer or purposes in public profiles');
await db.exec('set role anon;');
try {
  r = await q(`select count(*)::int n from users`);
  ok(r[0].n === 0, 'anonymous visitors read no user rows');
  r = await q(`select full_name from public_profiles where id = $1`, [A]);
  ok(r.length === 1, 'anonymous visitors (web page) can read seller public profile');
} finally {
  await db.exec('reset role;');
}

console.log('\n[13] Listing freshness');
await q(`update users set coin_balance = 500 where id = $1`, [A]);
const fresh = await asUser(A, () => q(`insert into listings (user_id, type, category, price, rooms, area_m2, district, lat, lng, availability_confirmed_at)
  values ($1, 'rent', 'residential', 5000000, 2, 50, 'Mirobod', 41.36, 69.36, '2020-01-01') returning *`, [A]));
ok(Math.abs(new Date(fresh[0].availability_confirmed_at) - Date.now()) < 60000, 'new listing is confirmed now (client value ignored)');
await q(`update listings set availability_confirmed_at = now() - interval '40 days', expires_at = now() + interval '10 days' where id = $1`, [fresh[0].id]);
await asUser(A, () => q(`update listings set availability_confirmed_at = now(), description = 'edited' where id = $1`, [fresh[0].id]));
r = await q(`select availability_confirmed_at < now() - interval '39 days' stale from listings where id = $1`, [fresh[0].id]);
ok(r[0].stale === true, 'owner cannot fake a confirmation date by direct update');
r = await asUser(A, () => q(`select confirm_listing_available($1) at`, [fresh[0].id]));
r = await q(`select availability_confirmed_at > now() - interval '1 minute' confirmed, expires_at > now() + interval '89 days' renewed from listings where id = $1`, [fresh[0].id]);
ok(r[0].confirmed && r[0].renewed, 'confirm_listing_available sets today and renews expiry to 90 days');
await expectError(() => asUser(B, () => q(`select confirm_listing_available($1)`, [fresh[0].id])), 'listing_not_confirmable', "cannot confirm someone else's listing");
await q(`update listings set expires_at = now() - interval '1 day' where id = $1`, [fresh[0].id]);
const archived = (await q(`select archive_expired_listings() n`))[0].n;
r = await q(`select status, archived_reason from listings where id = $1`, [fresh[0].id]);
ok(archived >= 1 && r[0].status === 'archived' && r[0].archived_reason === 'expired', 'expired listings are archived by the daily job');
await expectError(() => asUser(A, () => q(`select confirm_listing_available($1)`, [fresh[0].id])), 'listing_not_confirmable', 'archived listings cannot be confirmed (reactivate instead)');
await asUser(A, () => q(`update listings set status = 'active', archived_reason = null where id = $1`, [fresh[0].id]));
r = await q(`select availability_confirmed_at > now() - interval '1 minute' c from listings where id = $1`, [fresh[0].id]);
ok(r[0].c === true, 'reactivation counts as confirmation');
await expectError(() => asUser(A, () => q(`select archive_expired_listings()`)), 'permission denied', 'app users cannot run the archive job');

console.log('\n[14] Storage, account deletion, purge');
const own = await asUser(A, () => postListing(A, { area_m2: 81 }));
await asUser(A, () => q(`insert into storage.objects (bucket_id, name) values ('reyeltor-listings', $1)`, [`${own.id}/1.jpg`]));
ok(true, 'owner can upload into own listing folder');
await expectError(() => asUser(B, () => q(`insert into storage.objects (bucket_id, name) values ('reyeltor-listings', $1)`, [`${own.id}/evil.jpg`])), 'row-level security', "cannot upload into someone else's listing folder");
r = await asUser(B, () => q(`delete from storage.objects where name = $1 returning id`, [`${own.id}/1.jpg`]));
ok(r.length === 0, "cannot delete someone else's photos");
r = await asUser(B, () => q(`update storage.objects set name = 'x' where name = $1 returning id`, [`${own.id}/1.jpg`]));
ok(r.length === 0, "cannot overwrite someone else's photos");
r = await asUser(A, () => q(`delete from storage.objects where name = $1 returning id`, [`${own.id}/1.jpg`]));
ok(r.length === 1, 'owner can delete own photos');

await q(`insert into listing_photos (listing_id, storage_path, order_index) values ($1, $2, 0)`, [own.id, `${own.id}/2.jpg`]);
await q(`update listings set status = 'archived', archived_reason = 'manually_archived', archived_at = now() - interval '31 days', deletes_at = now() - interval '1 day' where id = $1`, [own.id]);
await expectError(() => asUser(A, () => q(`select * from purge_deleted_listings()`)), 'permission denied', 'app users cannot run the purge');
r = await q(`select * from purge_deleted_listings()`);
ok(r.some((x) => x.storage_path === `${own.id}/2.jpg`), 'purge returns photo paths for storage cleanup');
r = await q(`select 1 from listings where id = $1`, [own.id]);
ok(r.length === 0, 'listings past their 30-day archive period are deleted');

await expectError(() => db.exec(`set role anon;`).then(() => q(`select delete_my_account()`)).finally(() => db.exec('reset role;')), 'permission denied', 'anonymous callers cannot delete accounts');
await asUser(E, () => q(`select delete_my_account()`));
r = await q(`select (select count(*)::int from auth.users where id = $1) a, (select count(*)::int from users where id = $1) u, (select count(*)::int from flags where user_id = $1) f`, [E]);
ok(r[0].a === 0 && r[0].u === 0, 'delete_my_account removes the sign-in and the profile');
r = await q(`select count(*)::int n from auth.users where id = $1`, [D]);
ok(r[0].n === 1, 'other accounts untouched');

console.log('\n[15] Email visibility and phone check');
await asUser(A, () => q(`update users set email_visible = false where id = $1`, [A]));
r = await q(`select email from public_profiles where id = $1`, [A]);
ok(r[0].email === null, 'hidden email is not shown on the public profile');
await asUser(A, () => q(`update users set email_visible = true where id = $1`, [A]));
r = await q(`select email from public_profiles where id = $1`, [A]);
ok(r[0].email === 'a@x.uz', 'visible email is shown');
await db.exec('set role anon;');
try {
  r = await q(`select is_phone_registered('+998 90 111 11 11') a, is_phone_registered('+998907777777') b, is_phone_registered('') c`);
  ok(r[0].a === true && r[0].b === false && r[0].c === false, 'is_phone_registered matches formatted numbers, rejects empty');
} finally { await db.exec('reset role;'); }

console.log('\n[16] Telegram registration and phone/password login');
const T = '66666666-6666-6666-6666-666666666666';
await db.query(`insert into auth.users (id, email, raw_user_meta_data, encrypted_password) values ($1, 'tg555@telegram.reyeltor.invalid', $2, extensions.crypt('s3cret-pass', extensions.gen_salt('bf')))`,
  [T, JSON.stringify({ full_name: 'Aziz Karimov', phone: '+998906666666', phone_visible: true })]);
r = await q(`select full_name, email, phone from users where id = $1`, [T]);
ok(r[0].email === null && r[0].full_name === 'Aziz Karimov' && r[0].phone === '+998906666666', 'Telegram account without email: profile email stays empty, name and phone saved');
await q(`update users set telegram_id = 555, phone_verified_at = now() where id = $1`, [T]);
await asUser(T, () => q(`update users set phone = '+998907777777', telegram_id = 1, phone_verified_at = null where id = $1`, [T]));
r = await q(`select phone, telegram_id, phone_verified_at is not null v from users where id = $1`, [T]);
ok(r[0].phone === '+998906666666' && Number(r[0].telegram_id) === 555 && r[0].v, 'users cannot change a verified phone or their Telegram link');
await asUser(T, () => q(`update users set email = 'squat@x.uz' where id = $1`, [T]));
r = await q(`select email from users where id = $1`, [T]);
ok(r[0].email === null, 'users cannot write an unconfirmed email into their profile');
await q(`update auth.users set email = 'aziz@x.uz' where id = $1`, [T]); // Supabase does this when the link is clicked
r = await q(`select email from users where id = $1`, [T]);
ok(r[0].email === 'aziz@x.uz', 'a confirmed email change is copied to the profile');

r = await q(`select find_user_by_phone('+998 90 666-66-66') a, find_user_by_phone('906666666') b, find_user_by_phone('998906666666') c, find_user_by_phone('123') d`);
ok(r[0].a === T && r[0].b === T && r[0].c === T && r[0].d === null, 'phone lookup matches any formatting, ignores short input');
await expectError(() => asUser(A, () => q(`select find_user_by_phone('+998906666666')`)), 'permission denied', 'app users cannot look up phones');

const login = async (id, pw, ip = '1.1.1.1') => (await q(`select * from auth_password_login($1, $2, $3)`, [id, pw, ip]))[0];
r = await login('+998 90 666 66 66', 's3cret-pass');
ok(r.status === 'ok' && r.user_id === T, 'phone + password login works');
r = await login('AZIZ@x.uz', 's3cret-pass');
ok(r.status === 'ok' && r.user_id === T, 'email + password login works (case-insensitive)');
r = await login('+998906666666', 'wrong');
ok(r.status === 'invalid_credentials' && r.user_id === null, 'wrong password rejected');
r = await login('+998909999999', 'whatever');
ok(r.status === 'invalid_credentials', 'unknown phone gives the same answer as a wrong password');
for (let i = 0; i < 4; i++) await login('+998906666666', 'wrong');
r = await login('+998906666666', 's3cret-pass');
ok(r.status === 'too_many_attempts', 'locked after 5 failed attempts in 15 minutes');
await q(`update auth_login_attempts set attempted_at = now() - interval '20 minutes'`);
r = await login('+998906666666', 's3cret-pass');
ok(r.status === 'ok', 'lock expires');
await expectError(() => asUser(A, () => q(`select * from auth_password_login('+998906666666', 's3cret-pass')`)), 'permission denied', 'app users cannot call the password check');
await q(`insert into telegram_auth_flows (purpose, secret_hash, start_code) values ('register', 'h', 'abcdefghijklmnopqrstuvwx')`);
// The patch revokes table access; this harness re-grants everything afterwards, so RLS is the layer under test here.
r = await asUser(A, () => q(`select (select count(*)::int from telegram_auth_flows) f, (select count(*)::int from auth_login_attempts) a`));
ok(r[0].f === 0 && r[0].a === 0, 'Telegram flows and login attempts are invisible to app users');
await db.exec('set role anon;');
try {
  r = await q(`select is_phone_registered('906666666') a`);
  ok(r[0].a === true, 'sign-up duplicate check uses the same phone matching');
} finally { await db.exec('reset role;'); }

console.log('\n[17] Last-search alerts');
await q(`update users set coin_balance = 500 where id = $1`, [A]);
const lastFilters = { ...rentFlat, districts: ['Yakkasaroy'], priceMax: '9000000' };
const lastId = (await asUser(C, () => q(`select set_last_search($1, 'Ijara · Yakkasaroy') id`, [JSON.stringify(lastFilters)])))[0].id;
ok(!!lastId, 'last search stored');
r = await asUser(C, () => q(`select count(*)::int n from saved_searches where user_id = $1 and kind = 'saved'`, [C]));
const savedBefore = r[0].n;
const again = (await asUser(C, () => q(`select set_last_search($1, 'x') id`, [JSON.stringify(lastFilters)])))[0].id;
ok(again === lastId, 'same filters keep the same last search (one per user)');
r = await asUser(C, () => q(`select count(*)::int n from saved_searches where user_id = $1 and kind = 'last'`, [C]));
ok(r[0].n === 1, 'exactly one last search per user');
// It does not count toward the 10 saved searches.
for (let i = savedBefore; i < 10; i++) {
  await asUser(C, () => q(`insert into saved_searches (user_id, name, filters) values ($1, $2, $3)`, [C, `S${i}`, JSON.stringify({ ...rentFlat, priceMax: String(1000000 + i) })]));
}
r = await asUser(C, () => q(`select count(*)::int n from saved_searches where user_id = $1`, [C]));
ok(r[0].n === 11, 'last search does not use one of the 10 saved-search slots');
await expectError(() => asUser(C, () => q(`update saved_searches set kind = 'saved' where id = $1`, [lastId])), 'saved_search_limit', 'saving the last search respects the limit');
await asUser(C, () => q(`delete from saved_searches where user_id = $1 and kind = 'saved' and name like 'S%'`, [C]));

// Matching + delivery
const lastHit = await asUser(A, () => postListing(A, { type: 'rent', category: 'residential', property_type: 'apartment', price: 7_000_000, rooms: 2, area_m2: 55, district: 'Yakkasaroy' }));
await q(`update listings set posted_at = now() - interval '40 minutes' where id = $1`, [lastHit.id]);
await q(`select enqueue_saved_search_matches()`);
r = await q(`select * from claim_saved_search_matches('instant')`);
const lastClaim = r.find((x) => x.listing_id === lastHit.id && x.user_id === C);
ok(lastClaim && lastClaim.search_kind === 'last', 'new listing matching the last search is delivered (kind = last)');
await q(`update saved_search_matches set status = 'pushed' where status = 'sending'`);

// Changing filters drops alerts still queued for the old ones.
const pendingHit = await asUser(A, () => postListing(A, { type: 'rent', category: 'residential', property_type: 'apartment', price: 6_000_000, rooms: 2, area_m2: 50, district: 'Yakkasaroy' }));
await q(`update listings set posted_at = now() - interval '40 minutes' where id = $1`, [pendingHit.id]);
await q(`select enqueue_saved_search_matches()`);
await asUser(C, () => q(`select set_last_search($1, 'Ijara · Chilanzar')`, [JSON.stringify({ ...lastFilters, districts: ['Chilanzar'] })]));
r = await q(`select count(*)::int n from saved_search_matches where search_id = $1 and status = 'pending'`, [lastId]);
ok(r[0].n === 0, 'changing the last search drops alerts queued for the old filters');

// Same filters as a saved search: no duplicate alerts.
await asUser(C, () => q(`insert into saved_searches (user_id, name, filters) values ($1, 'Chilanzar', $2)`, [C, JSON.stringify({ ...lastFilters, districts: ['Chilanzar'] })]));
r = (await asUser(C, () => q(`select set_last_search($1, 'dup') id`, [JSON.stringify({ ...lastFilters, districts: ['Chilanzar'] })])))[0];
ok(r.id === null, 'last search equal to a saved search is dropped (that one alerts already)');
await expectError(() => db.exec(`set role anon;`).then(() => q(`select set_last_search('{"category":"residential"}', 'x')`)).finally(() => db.exec('reset role;')), 'permission denied', 'guests cannot store a last search');

console.log('\n[18] Price-drop alerts on favorites');
const fav = await asUser(A, () => postListing(A, { type: 'buy', category: 'residential', property_type: 'apartment', price: 1_000_000_000, rooms: 3, area_m2: 80, district: 'Mirobod' }));
await asUser(B, () => q(`insert into favorites (user_id, listing_id, alert_price) values ($1, $2, 1)`, [B, fav.id]));
r = await q(`select alert_price from favorites where user_id = $1 and listing_id = $2`, [B, fav.id]);
ok(Number(r[0].alert_price) === 1_000_000_000, 'reference price = price when saved (client value ignored)');
await asUser(B, () => q(`update favorites set alert_price = 5 where user_id = $1 and listing_id = $2`, [B, fav.id]));
r = await q(`select alert_price from favorites where user_id = $1 and listing_id = $2`, [B, fav.id]);
ok(Number(r[0].alert_price) === 1_000_000_000, 'users cannot change the reference price');

await asUser(A, () => q(`update listings set price = 980000000 where id = $1`, [fav.id]));
r = await q(`select * from claim_price_drop_alerts()`);
ok(!r.some((x) => x.listing_id === fav.id), 'a 2% drop sends nothing');
await asUser(A, () => q(`update listings set price = 960000000 where id = $1`, [fav.id]));
r = await q(`select * from claim_price_drop_alerts()`);
const drop = r.find((x) => x.listing_id === fav.id && x.user_id === B);
ok(drop && Number(drop.old_price) === 1_000_000_000 && Number(drop.new_price) === 960_000_000, 'small drops add up: 4% below the saved price alerts once (1 000 000 000 → 960 000 000)');
r = await q(`select * from claim_price_drop_alerts()`);
ok(!r.some((x) => x.listing_id === fav.id), 'the same drop is not sent twice');
await asUser(A, () => q(`update listings set price = 1100000000 where id = $1`, [fav.id]));
await q(`select * from claim_price_drop_alerts()`);
await asUser(A, () => q(`update listings set price = 1050000000 where id = $1`, [fav.id]));
r = await q(`select * from claim_price_drop_alerts()`);
ok(r.some((x) => x.listing_id === fav.id && Number(x.old_price) === 1_100_000_000), 'after a rise, a 4.5% fall from the higher price alerts');
const ownFav = await asUser(B, () => postListing(B, { price: 500_000_000 }));
await asUser(B, () => q(`insert into favorites (user_id, listing_id) values ($1, $2)`, [B, ownFav.id]));
await asUser(B, () => q(`update listings set price = 400000000 where id = $1`, [ownFav.id]));
r = await q(`select * from claim_price_drop_alerts()`);
ok(!r.some((x) => x.listing_id === ownFav.id), 'no alert for your own listing');
await expectError(() => asUser(B, () => q(`select * from claim_price_drop_alerts()`)), 'permission denied', 'app users cannot run the price-drop job');

console.log('\n[19] Error log + verified email edge cases');
await db.exec('set role anon;');
try {
  await q(`insert into app_errors (level, message, context, platform, app_version) values ('fatal', 'Boom', 'global', 'android 34', '1.3.0')`);
  ok(true, 'the app (even signed out) can report an error');
  const visible = await q(`select * from app_errors`);
  ok(visible.length === 0, 'error reports are not readable from the app');
  await expectError(() => q(`insert into app_errors (message) values ($1)`, ['x'.repeat(600)]), 'check', 'oversized reports are rejected');
} finally { await db.exec('reset role;'); }
r = await q(`select count(*)::int n from app_errors`);
ok(r[0].n === 1, 'report stored');
await q(`update app_errors set created_at = now() - interval '31 days'`);
r = await q(`select purge_old_app_errors() n`);
ok(r[0].n === 1, 'reports older than 30 days are purged');
// Someone typed an address into an old profile; the real owner confirms it: owner wins.
await q(`update users set email = 'owner@x.uz' where id = $1`, [D]);
await q(`update auth.users set email = 'owner@x.uz' where id = $1`, [T]);
r = await q(`select (select email from users where id = $1) t, (select email from users where id = $2) d`, [T, D]);
ok(r[0].t === 'owner@x.uz' && r[0].d === null, 'the confirmed owner of an address takes it over');
await q(`update auth.users set email = 'tg555@telegram.reyeltor.invalid' where id = $1`, [T]);
r = await q(`select email from users where id = $1`, [T]);
ok(r[0].email === null, 'removing the email (placeholder sign-in address) clears the profile email');

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
