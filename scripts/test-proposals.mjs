// Integration test for ticket T11 against the LOCAL Supabase only (supabase start). It creates throwaway users, proposals and
// flocks and deletes them afterwards.   node scripts/test-proposals.mjs
//   Done when: the flock is created only on the last accept; a decline closes the proposal.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

// ---- throwaway people: a asked the agent, b and c are invited, d is not on any proposal ----
const tag = randomUUID().slice(0, 8);
const people = {};
for (const key of ['a', 'b', 'c', 'd']) {
  const id = randomUUID(), email = `t11-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), `create ${key}`);
  must(await admin.from('profiles').upsert({ id, username: `t11_${tag}_${key}`, display_name: `T11 ${key}`, is_demo: false }), `profile ${key}`);
  const s = must(await createClient(st.API_URL, st.ANON_KEY, opts).auth.signInWithPassword({ email, password }), `sign in ${key}`);
  people[key] = { id, db: createClient(st.API_URL, st.ANON_KEY, { ...opts, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } }) };
}
const { a, b, c, d } = people;

const proposals = [];
const propose = async (members) => {
  const p = must(await admin.from('proposals').insert({ created_by: a.id, suggested_name: 'T11 test flock' }).select('id').single(), 'proposal');
  must(await admin.from('proposal_members').insert(members.map((m) => ({ proposal_id: p.id, user_id: m.id }))), 'proposal members');
  proposals.push(p.id);
  return p.id;
};
const respond = async (who, id, accept) => who.db.rpc('respond_to_proposal', { p_proposal_id: id, p_accept: accept });
const proposal = async (id) => must(await admin.from('proposals').select('status, flock_id').eq('id', id).single(), 'read proposal');

try {
  // ---- done when: the flock is created only on the last accept ----
  const p1 = await propose([b, c]);
  const r1 = await respond(b, p1, true);
  check(r1.data === 'waiting' && (await proposal(p1)).flock_id === null, 'the first accept creates no flock');
  check((await respond(b, p1, true)).data === 'already_responded', 'answering twice changes nothing');
  const r2 = await respond(c, p1, true);
  const done = await proposal(p1);
  check(r2.data === 'flock_created' && done.status === 'accepted' && !!done.flock_id, 'the last accept creates the flock and marks the proposal accepted');
  const members = must(await admin.from('flock_members').select('user_id, role, status').eq('flock_id', done.flock_id), 'members');
  check(members.length === 3 && members.every((m) => m.status === 'active'), 'the flock has the two invitees and the person who asked, all active');
  check(members.find((m) => m.user_id === a.id)?.role === 'admin', 'the person who asked the agent is the admin');
  check((await respond(b, p1, false)).data === 'closed', 'an accepted proposal cannot be answered again');

  // ---- done when: a decline closes the proposal ----
  const p2 = await propose([b, c]);
  check((await respond(b, p2, false)).data === 'declined' && (await proposal(p2)).status === 'declined', 'a decline closes the proposal');
  check((await respond(c, p2, true)).data === 'closed' && (await proposal(p2)).flock_id === null, 'a later accept on a closed proposal makes no flock');

  // ---- two final accepts at the same moment make exactly one flock ----
  let bad = 0;
  for (let i = 0; i < 15; i++) {
    const p = await propose([b, c]);
    const [x, y] = await Promise.all([respond(b, p, true), respond(c, p, true)]);
    const got = [x.data, y.data].sort().join(',');
    const n = must(await admin.from('flock_members').select('user_id').eq('flock_id', (await proposal(p)).flock_id ?? randomUUID()), 'count');
    if (got !== 'flock_created,waiting' || n.length !== 3) { bad++; console.log('   round', i, got, 'members', n.length, x.error?.message ?? '', y.error?.message ?? ''); }
  }
  check(bad === 0, '15 races between the last two accepts: exactly one flock_created, never two flocks');

  // ---- who may answer ----
  const p3 = await propose([b, c]);
  const out = await respond(d, p3, true);
  check(!!out.error && (await proposal(p3)).flock_id === null, 'someone not invited cannot answer');
  const anon = createClient(st.API_URL, st.ANON_KEY, opts);
  // supabase/dev-open-access.sql lets everyone read every row, which makes the read check meaningless: skip it there.
  if (((await anon.from('profiles').select('id').limit(1)).data?.length ?? 0) > 0) console.log('skip  read privacy: dev-open-access.sql is applied here (supabase db reset, migrations only, to run it)');
  else check((await d.db.from('proposals').select('id').eq('id', p3)).data?.length === 0, 'someone not invited cannot read the proposal');
  check(!!(await anon.rpc('respond_to_proposal', { p_proposal_id: p3, p_accept: true })).error, 'a signed-out visitor cannot answer');

  // ---- expiry ----
  const p4 = await propose([b, c]);
  must(await admin.from('proposals').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', p4), 'expire');
  check((await respond(b, p4, true)).data === 'expired' && (await proposal(p4)).status === 'expired', 'an expired proposal cannot be accepted');
} finally {
  for (const id of proposals) {
    const { flock_id } = (await admin.from('proposals').select('flock_id').eq('id', id).single()).data ?? {};
    await admin.from('proposals').delete().eq('id', id);
    if (flock_id) await admin.from('flocks').delete().eq('id', flock_id);
  }
  for (const p of Object.values(people)) { await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
