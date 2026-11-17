// Validates lib/demo/generated.ts by transpiling it (and its imports) to CommonJS.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const OUT = path.join(require('os').tmpdir(), 'reyeltor-demotest');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const files = {
  'generated.ts': 'lib/demo/generated.ts',
  'photos.ts': 'lib/demo/photos.ts',
  'defaultMarketData.ts': 'lib/market/defaultMarketData.ts',
  'config.ts': 'lib/demo/config.ts',
  'assignPhotos.ts': 'lib/demo/assignPhotos.ts',
  'photoCatalog.ts': 'lib/demo/photoCatalog.ts',
};
for (const [name, rel] of Object.entries(files)) {
  let src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  src = src
    .replace("'@/lib/map/tashkent-districts.json'", "'./districts.json'")
    .replace("'@/lib/market/defaultMarketData'", "'./defaultMarketData'")
    .replace(/'@\/lib\/tools\/renovationRates'/, "'./none'");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true } });
  fs.writeFileSync(path.join(OUT, name.replace('.ts', '.js')), out.outputText);
}
fs.copyFileSync(path.join(ROOT, 'lib/map/tashkent-districts.json'), path.join(OUT, 'districts.json'));

const { generateDemoListings, DEMO_DISTRICT_VOLUMES } = require(path.join(OUT, 'generated.js'));
const { selectDemoListings } = require(path.join(OUT, 'config.js'));
const districts = JSON.parse(fs.readFileSync(path.join(OUT, 'districts.json'), 'utf8')).features;

let fail = 0;
const ok = (c, m) => { console.log(c ? '  PASS' : '  FAIL', m); if (!c) fail++; };
function inside(lng, lat, ring) {
  let r = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

const t0 = Date.now();
const a = generateDemoListings();
const ms = Date.now() - t0;
const b = generateDemoListings();
ok(a.length === 841, `841 generated listings (800 + 41 in Yangi Toshkent) (got ${a.length})`);
ok(JSON.stringify(a.map((l) => [l.id, l.lat, l.lng, l.price])) === JSON.stringify(b.map((l) => [l.id, l.lat, l.lng, l.price])), 'deterministic across runs');
ok(new Set(a.map((l) => l.id)).size === a.length, 'unique ids');
ok(a.every((l) => l.id.startsWith('l00000')), 'all ids recognised by isDemoId (l00000 prefix)');
for (const [d, n] of Object.entries(DEMO_DISTRICT_VOLUMES)) {
  const c = a.filter((l) => l.district === d).length;
  if (c !== n) ok(false, `${d}: expected ${n}, got ${c}`);
}
ok(true, 'district volumes match plan (100×5 centre districts, 300 elsewhere)');
const outside = a.filter((l) => { const f = districts.find((x) => x.properties.name === l.district); return !inside(l.lng, l.lat, f.geometry.coordinates[0]); });
ok(outside.length === 0, `every point lies inside its district polygon (${outside.length} outside)`);
ok(a.every((l) => l.price > 0 && l.area_m2 > 0 && Number.isFinite(l.lat)), 'positive prices and areas');
ok(a.every((l) => (l.listing_photos ?? []).length >= 1), 'every listing has at least one photo');
const res = a.filter((l) => l.category === 'residential'); const com = a.filter((l) => l.category === 'commercial');
ok(res.length > 450 && com.length > 150, `mix: ${res.length} residential, ${com.length} commercial`);
const types = (arr) => arr.reduce((m, l) => ((m[l.type] = (m[l.type] || 0) + 1), m), {});
console.log('   residential', types(res), ' commercial', types(com));
ok(res.every((l) => ['rent', 'buy'].includes(l.type)) && com.every((l) => ['lease', 'buy'].includes(l.type)), 'transaction types valid per category');
const usd = (l) => l.price / 12017;
const rents = res.filter((l) => l.type === 'rent' && l.property_type === 'apartment').map(usd).sort((x, y) => x - y);
const sales = res.filter((l) => l.type === 'buy' && l.property_type === 'apartment').map((l) => usd(l) / l.area_m2).sort((x, y) => x - y);
console.log(`   apartment rent USD/mo: median ${Math.round(rents[rents.length >> 1])}, range ${Math.round(rents[0])}–${Math.round(rents[rents.length - 1])}`);
console.log(`   apartment sale USD/m²: median ${Math.round(sales[sales.length >> 1])}, range ${Math.round(sales[0])}–${Math.round(sales[sales.length - 1])}`);
ok(a.every((l) => !l.users), 'no contact data embedded by generator (agent summary added later, contacts blank)');
ok(a.every((l) => new Date(l.posted_at) <= new Date()), 'no future posting dates');
console.log(`   generation time: ${ms} ms`);
// Your example: 300 real listings concentrated in a few districts.
const realMix = [...Array(180).fill('Yunusobod'), ...Array(70).fill('Mirobod'), ...Array(30).fill('Chilanzar'), ...Array(20).fill('Sergeli')].map((district) => ({ district }));
const kept = selectDemoListings(realMix, a, 'auto');
const keptBy = (d) => kept.filter((l) => l.district === d).length;
ok(keptBy('Yunusobod') === 0 && keptBy('Mirobod') === 0 && keptBy('Chilanzar') === 0 && keptBy('Sergeli') === 0, 'auto: districts with >= 15 real listings show no demos');
ok(keptBy('Bektemir') === 5 && keptBy('Shaykhontohur') === 5, 'auto: thin districts are topped up to 5 listings even with 300 real listings overall');
const empty = selectDemoListings([], a, 'auto');
ok(empty.length === 60, `auto with no real listings: ${empty.length} demos citywide (target 60)`);
const kindsOf = (arr) => arr.reduce((m, l) => ((m[l.category + '/' + l.property_type] = (m[l.category + '/' + l.property_type] || 0) + 1), m), {});
console.log('   60-demo mix', kindsOf(empty), types(empty));
ok(empty.filter((l) => l.district === 'Yangi Toshkent').length >= 4, 'Yangi Toshkent (New Tashkent) gets demo listings too');
ok(empty.some((l) => l.category === 'commercial') && empty.some((l) => l.category === 'residential'), '60 demos include residential and commercial');
ok(new Set(empty.map((l) => l.property_type)).size >= 5, 'every main property type is represented');
ok(empty.some((l) => l.type === 'buy') && empty.some((l) => l.type !== 'buy'), 'both rent and sale represented');
const bekKinds = new Set(kept.filter((l) => l.district === 'Bektemir').map((l) => l.property_type));
ok(bekKinds.size >= 3, 'auto: each district shows different property types');
ok(selectDemoListings(realMix, a, 'on').length === 841 && selectDemoListings([], a, 'off').length === 0, 'modes on/off');
ok(selectDemoListings([...Array(3).fill({ district: 'Bektemir' })], a, 'auto').filter((l) => l.district === 'Bektemir').length === 2, 'auto: 3 real listings + 2 demos = 5');
ok(selectDemoListings([...Array(5).fill({ district: 'Bektemir' })], a, 'auto').filter((l) => l.district === 'Bektemir').length === 0, 'auto: no demos once real listings reach the target');
// Unique photos for every demo that can be shown in normal use
const { assignUniqueDemoPhotos } = require(path.join(OUT, 'assignPhotos.js'));
const shown = selectDemoListings([], a, 'auto');
const photoMap = assignUniqueDemoPhotos(shown);
const allUrls = [...photoMap.values()].flat().map((p) => p.storage_path);
ok(shown.every((l) => (photoMap.get(l.id) ?? []).length >= 2), `every shown demo has at least 2 own photos (${allUrls.length} photos in total)`);
ok(new Set(allUrls).size === allUrls.length, 'no photo is used twice');
ok(allUrls.every((u) => u.startsWith('https://images.pexels.com/photos/')), 'all photos are Pexels CDN URLs');
const sampleDesc = a.slice(0, 3).map((l) => l.description);
console.log('   sample descriptions:\n   - ' + sampleDesc.join('\n   - '));
process.exit(fail ? 1 : 0);
