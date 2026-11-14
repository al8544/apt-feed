// Integration test for the places layer (ticket T15) against the LOCAL Supabase only (supabase start): the OpenStreetMap places that
// scripts/ingest-places.ts loaded, searched by free words, with real distances.   node scripts/test-places.mjs
//   Needs the places loaded first (see scripts/ingest-places.ts). Read-only: it writes nothing.
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { supabasePlaceStore, surroundingsEvidence } from '../lib/enrich/places.ts';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const anon = createClient(st.API_URL, st.ANON_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);

const total = (await anon.from('places').select('id', { count: 'exact', head: true })).count ?? 0;
if (total < 1000) { console.error(`Only ${total} places are loaded: run scripts/ingest-places.ts first.`); process.exit(1); }
const store = supabasePlaceStore(anon);
const LA = { south: 33.89, north: 34.26, west: -118.5, east: -118.15 };
const walk = (terms) => ({ terms, reach: 'walk', want: 'near' });

check(total > 10_000, `${total.toLocaleString()} places are loaded`);

// ---- any words, no categories ----
for (const [term, expect] of [['climbing', /climb/], ['vegan', /vegan/], ['hospital', /hospital/], ['bookstore', /book/], ['coworking', /cowork/], ['farmers market', /market/]]) {
  const { places } = await store.search(LA, [term]);
  check(places.length > 0, `"${term}" finds real places across LA (${places.length}), e.g. ${places.slice(0, 2).map((p) => `${p.name ?? '(unnamed)'} [${p.kind}]`).join('; ')}`);
  if (places.length) check(places.some((p) => expect.test(`${p.name ?? ''} ${p.kind}`.toLowerCase())), `...and what matched says why ("${term}")`);
}
check((await store.search(LA, ['zzzqqq'])).places.length === 0, 'a word nothing is called finds nothing');
check((await store.search(LA, ["'); drop table places; --"])).places.length === 0, 'a hostile string is just words: it finds nothing and breaks nothing');
check((await anon.from('places').select('id', { count: 'exact', head: true })).count === total, '...and the table is intact');

// ---- a common word is paged through, not silently cut at 1,000 ----
const coffee = await store.search(LA, ['coffee', 'cafe']);
check(coffee.places.length > 1000, `a common need returns every match, not the first 1,000 (${coffee.places.length})`);
check(new Set(coffee.places.map((p) => p.id)).size === coffee.places.length, 'with no place repeated across pages');

// ---- real distances at places I know ----
const at = async (name, lat, lng, terms, check_) => {
  const box = { south: lat - 0.02, north: lat + 0.02, west: lng - 0.025, east: lng + 0.025 };
  const { places, loaded } = await store.search(box, terms);
  const e = surroundingsEvidence('x', walk(terms), lat, lng, places, loaded);
  check(check_(e), `${name}: ${e.text}`);
};
await at('beside Echo Park Lake there is a park', 34.0732, -118.2606, ['park'], (e) => e.status === 'found' && /Echo Park/.test(e.text) && /(right next door|about \d+ m away)/.test(e.text));
await at('at Union Station there is a transit stop right there', 34.056, -118.2365, ['station'], (e) => e.status === 'found' && /(right next door|about \d+ m away)/.test(e.text));
{
  const { places } = await store.search({ south: 34.04, north: 34.07, west: -118.25, east: -118.22 }, ['union station']);
  const d = places.map((p) => ({ p, d: Math.hypot((p.pts[0][0] - 34.056) * 111_320, (p.pts[0][1] + 118.2365) * 111_320 * 0.83) })).sort((a, b) => a.d - b.d)[0];
  check(!!d && d.d < 300, `"union station" finds Union Station itself (${d?.p.name}, ${Math.round(d?.d ?? 0)} m from the pin)`);
}
const vets = (await store.search(LA, ['hospital'])).places.length, noVets = (await store.search(LA, ['hospital'], ['veterinary', 'animal', 'pet'])).places;
check(noVets.length > 0 && noVets.length < vets && noVets.every((p) => !/\b(veterinary|animal|pet)/.test(`${p.name} ${p.kind}`.toLowerCase())), `saying what must not match removes the animal hospitals (${vets} -> ${noVets.length})`);
await at('in the middle of the ocean there is nothing', 33.9, -118.49, ['hospital'], (e) => e.status === 'not_seen' && /on the map data/.test(e.text));

// ---- who may read and write ----
const denied = await anon.from('places').insert({ id: 'x', kind: 'x', search_text: 'x', lat: 0, lng: 0, south: 0, north: 0, west: 0, east: 0, pts: [] });
check(!!denied.error, 'a signed-out visitor cannot write places');
check((await anon.from('places').select('id').limit(1)).data?.length === 1, 'but anyone can read them');

// ---- the map being down must not break the caller ----
const dead = supabasePlaceStore(createClient('http://127.0.0.1:9', st.ANON_KEY, opts));
check(await dead.search(LA, ['gym']).then(() => false, () => true), 'an unreachable database throws, so callers can say "unavailable" (lib/agent/ducktect.ts catches it)');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
