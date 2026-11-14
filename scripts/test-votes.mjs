// Integration test for ticket T8 against the LOCAL Supabase only: one member's thumbs vote reaches the other member's live
// subscription, a stranger gets nothing, and the removal rule sees the right counts.   node scripts/test-votes.mjs
// Needs the migrations only (supabase db reset), because the privacy part means nothing once dev-open-access.sql is applied.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { voteState } from '../lib/compare.ts';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
const anon = createClient(st.API_URL, st.ANON_KEY, opts);
if (((await anon.from('profiles').select('id').limit(1)).data?.length ?? 0) > 0) {
  console.error('dev-open-access.sql is applied here. Run: supabase db reset (migrations only), then this test.'); process.exit(1);
}

let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tag = randomUUID().slice(0, 8), people = {};
for (const key of ['a', 'b', 'c']) {
  const id = randomUUID(), email = `t8-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), `create ${key}`);
  must(await admin.from('profiles').insert({ id, username: `t8_${tag}_${key}`, display_name: `T8 ${key}`, is_demo: false }), `profile ${key}`);
  const db = createClient(st.API_URL, st.ANON_KEY, opts);          // this client keeps its session, so realtime is authorized as that person
  must(await db.auth.signInWithPassword({ email, password }), `sign in ${key}`);
  people[key] = { id, db };
}
const { a, b, c } = people;
const listing = must(await admin.from('listings').select('id').limit(1), 'listing')[0].id;
let flock;
try {
  flock = must(await a.db.rpc('create_flock', { p_name: 'votes test' }), 'flock');
  must(await admin.from('flock_members').insert({ flock_id: flock, user_id: b.id, status: 'active', joined_via: 'invite' }), 'add b');

  const heard = { b: [], c: [] };
  const listen = (who, key) => new Promise((resolve) => {
    who.db.channel(`t8-${key}-${tag}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swipes', filter: `flock_id=eq.${flock}` }, (p) => heard[key].push(p))
      .subscribe((s) => s === 'SUBSCRIBED' && resolve());
  });
  await Promise.all([listen(b, 'b'), listen(c, 'c')]);
  await sleep(2500); // realtime needs a moment after SUBSCRIBED to authorize each listener

  const vote = (who, direction) => who.db.from('swipes').upsert({ user_id: who.id, listing_id: listing, flock_id: flock, direction }, { onConflict: 'user_id,listing_id,flock_id' });
  const waitFor = async (fn, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(100); } return false; };

  must(await vote(a, 'left'), 'a votes down');
  check(await waitFor(() => heard.b.length >= 1), 'one member\'s thumbs-down reaches the other member live, without a reload');
  check(heard.b[0]?.new?.direction === 'left' && heard.b[0]?.new?.user_id === a.id, 'the live event says who voted and which way');
  await sleep(2000);
  check(heard.c.length === 0, 'a person outside the flock hears nothing');

  const votes = must(await b.db.from('flock_votes').select('likes, down').eq('flock_id', flock).eq('listing_id', listing), 'votes')[0];
  check(votes?.down === 1 && votes?.likes === 0, 'the other member reads down = 1 from the flock votes');
  check(voteState(votes.down, 2).removed === true, 'with 2 members, 1 thumbs-down takes the place off the active list');

  const before = heard.b.length;
  must(await vote(a, 'right'), 'a changes the vote');
  check(await waitFor(() => heard.b.length > before), 'changing a vote also reaches the other member live');
  const after = must(await b.db.from('flock_votes').select('likes, down').eq('flock_id', flock).eq('listing_id', listing), 'votes')[0];
  check(after?.likes === 1 && after?.down === 0 && voteState(after.down, 2).removed === false, 'the changed vote replaces the old one (one row per person): the place is back');
  const rows = must(await admin.from('swipes').select('user_id').eq('flock_id', flock).eq('listing_id', listing), 'rows');
  check(rows.length === 1, 'still exactly one vote row for that person and place');
} finally {
  if (flock) await admin.from('flocks').delete().eq('id', flock);
  for (const p of Object.values(people)) { await p.db.removeAllChannels(); await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
