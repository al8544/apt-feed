// Integration test for ticket T14's storage against the LOCAL Supabase only (supabase start). It uses one existing community, writes
// throwaway cache rows for it, and removes them afterwards.   node scripts/test-aerial.mjs
//   Done when: the demo properties return cached aerial evidence; failures degrade cleanly.
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { aerialEvidence, supabaseAerialStore } from '../lib/enrich/aerial.ts';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
const anon = createClient(st.API_URL, st.ANON_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

// A community nothing else has cached yet: a throwaway one, so real demo data is never touched.
const community = must(await admin.from('communities').insert({ costar_property_id: `t14-test-${Date.now()}`, name: 'T14 test community', lat: 34.05, lng: -118.25 }).select('id, lat, lng').single(), 'community');
const C = { id: community.id, lat: community.lat, lng: community.lng };
const store = supabaseAerialStore(admin);
const imagery = { collection: 'us-ca-losangeles-2025', capturedAt: '2025-12-10' };
const row = (phrase, found, score) => ({ phrase, score, result: { method: 'detect', found, count: found ? 1 : 0, maxConfidence: score, threshold: 0.5, imagery } });
const rows = async () => must(await admin.from('aerial_queries').select('phrase, score').eq('community_id', C.id).order('phrase'), 'read');

try {
  // ---- the cache round trip ----
  await store.saveQueries(C.id, 80, [row('swimming pool', true, 0.71), row('tennis court', false, 0)]);
  check((await rows()).length === 2, 'two answers saved, including "looked and saw none"');
  await store.saveQueries(C.id, 80, [row('swimming pool', true, 0.71)]);
  check((await rows()).length === 2, 'saving the same answer again adds no row (idempotent)');
  await store.saveQueries(C.id, 80, [row('swimming pool', true, 0.9)]);
  check((await rows()).find((r) => r.phrase === 'swimming pool').score === 0.9, 'saving a newer answer replaces the old one');
  await store.saveQueries(C.id, 120, [row('swimming pool', false, 0)]);
  check((await rows()).length === 3, 'a different search size is its own row');
  check((await store.queries(C.id, 80, ['swimming pool', 'parking lot'])).length === 1, 'reading returns only what is cached for that size and phrase');

  // ---- property attributes leave the Apartments.com column alone ----
  must(await admin.from('listing_enrichment').insert({ community_id: C.id, apartments_com: { petsAllowed: true, amenities: ['gym'] } }), 'seed enrichment');
  await store.saveAttributes(C.id, { parcels: 3, pool: { detected: true, maxScore: 0.8 }, treeCoverPct: 8, treeCoverMaxPct: 13, collection: 'us-ca-glendale-2024' });
  const e = must(await admin.from('listing_enrichment').select('apartments_com, vexcel_attributes').eq('community_id', C.id).single(), 'read enrichment');
  check(e.apartments_com?.petsAllowed === true && e.vexcel_attributes?.parcels === 3, 'saving Vexcel attributes keeps the Apartments.com data on the same row');
  check((await store.attributes(C.id))?.treeCoverPct === 8, 'attributes read back');

  // ---- evidence straight from the database, with no Vexcel at all (what the demo serves) ----
  const out = await aerialEvidence(C, ['swimming pool', 'tennis court', 'trees', 'parking lot', 'quiet'], { store: supabaseAerialStore(anon) });
  check(out.map((x) => x.status).join(',') === 'found,not_seen,found,unavailable,not_checkable', `cached evidence is served read-only, the rest degrades (${out.map((x) => x.status).join(', ')})`);
  check(out[0].source === 'cache' && out[0].text.includes('not confirmed as a resident amenity'), 'it is worded as evidence, not as a promise');

  // ---- who may write ----
  const denied = await anon.from('aerial_queries').insert({ community_id: C.id, phrase: 'x', buffer_m: 1, result: {} });
  check(!!denied.error, 'a signed-out visitor cannot write the cache');
  const read = await anon.from('aerial_queries').select('phrase').eq('community_id', C.id);
  check((read.data?.length ?? 0) === 3, 'but anyone can read it');
  // A database that cannot be reached must not break the caller.
  const dead = createClient('http://127.0.0.1:9', st.ANON_KEY, opts);
  const down = await aerialEvidence(C, ['swimming pool'], { store: supabaseAerialStore(dead) });
  check(down[0].status === 'unavailable', 'an unreachable database reads as "aerial check unavailable", not an error');
} finally {
  await admin.from('communities').delete().eq('id', C.id); // cascades to aerial_queries and listing_enrichment
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
