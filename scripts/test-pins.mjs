// Integration test for the commute pin against the LOCAL Supabase only:  node scripts/test-pins.mjs
// Flockmates can see each other's pins and the distances to them (friends and open flocks alike), strangers cannot, and nobody can
// change someone else's pin. Needs migrations 0018 and 0019. Creates throwaway users and flocks and removes them.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { milesBetween } from '../lib/format.ts';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);

let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const tag = randomUUID().slice(0, 8), people = {}, flocks = [];
for (const key of ['a', 'b', 'c']) {
  const id = randomUUID(), email = `pins-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), `create ${key}`);
  const db = createClient(st.API_URL, st.ANON_KEY, opts);
  must(await db.auth.signInWithPassword({ email, password }), `sign in ${key}`);
  people[key] = { id, db };
}
const { a, b, c } = people;
const listing = must(await admin.from('listings').select('id,lat,lng').eq('source', 'costar').limit(1), 'listing')[0];
const pinA = { lat: 34.0195, lng: -118.4912 };
try {
  for (const kind of ['friends', 'open']) {
    const f = must(await admin.from('flocks').insert({ name: `pins ${kind} ${tag}`, kind, created_by: a.id }).select('id').single(), `flock ${kind}`).id;
    flocks.push(f);
    for (const p of [a, b]) must(await admin.from('flock_members').upsert({ flock_id: f, user_id: p.id, role: 'member', status: 'active', joined_via: 'invite' }), 'member');
    must(await a.db.from('member_pins').upsert({ user_id: a.id, ...pinA, label: 'Work' }), 'a sets a pin');

    const seen = must(await b.db.from('member_pins').select('lat,lng').eq('user_id', a.id), 'b reads');
    check(seen.length === 1, `${kind} flock: a flockmate can see someone's pin`);
    check((await c.db.from('member_pins').select('lat').eq('user_id', a.id)).data?.length === 0, `${kind} flock: a stranger cannot`);
    const tamper = await b.db.from('member_pins').update({ lat: 1 }).eq('user_id', a.id).select(); // asks for the changed rows back
    const after = must(await a.db.from('member_pins').select('lat').eq('user_id', a.id), 'a reads own');
    check(!tamper.error && tamper.data.length === 0 && after[0].lat === pinA.lat, `${kind} flock: a flockmate cannot change it`);

    const d = must(await b.db.rpc('flock_pin_distances', { p_flock_id: f, p_listing_ids: [listing.id] }), 'distances');
    check(d.length === 1 && d[0].pins === 1, `${kind} flock: distances work with a single pin`);
    check(Math.abs(d[0].max_mi - milesBetween(pinA, listing)) < 0.01, `${kind} flock: the distance matches the straight-line miles`);
    check(((await c.db.rpc('flock_pin_distances', { p_flock_id: f, p_listing_ids: [listing.id] })).data ?? []).length === 0, `${kind} flock: a stranger gets no distances`);
    await a.db.from('member_pins').delete().eq('user_id', a.id);
  }
} finally {
  for (const f of flocks) await admin.from('flocks').delete().eq('id', f);
  for (const p of Object.values(people)) await admin.auth.admin.deleteUser(p.id);
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
