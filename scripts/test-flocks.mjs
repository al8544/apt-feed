// Integration test for ticket T6 against the LOCAL Supabase only (supabase start). It creates throwaway users and flocks
// and deletes them afterwards.   node scripts/test-flocks.mjs
//   Done when: two concurrent joins on a flock with one open seat give exactly one success; non-members cannot read flock data.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st) { console.error('The local database is not running: supabase start'); process.exit(1); }
if (!/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Refusing: this test only runs against the local database.'); process.exit(1); }

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
const anon = createClient(st.API_URL, st.ANON_KEY, opts);
// The privacy checks mean nothing if supabase/dev-open-access.sql was applied (it lets the anon key read everything).
if (((await anon.from('profiles').select('id').limit(1)).data?.length ?? 0) > 0) {
  console.error('dev-open-access.sql is applied here, so the privacy checks would be meaningless. Run: supabase db reset (then the migrations only).');
  process.exit(1);
}
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

// ---- throwaway people ----
const tag = randomUUID().slice(0, 8);
const people = {};
for (const [key, p] of Object.entries({
  a: { budget_max: 4200, beds_min: 2 }, b: { budget_max: 4000, beds_min: 2 }, c: { budget_max: 2000, beds_min: 1 }, d: { budget_max: 5000, beds_min: 3 }, e: { budget_max: 3000, beds_min: 1 },
})) {
  const id = randomUUID(), email = `t6-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), `create ${key}`);
  must(await admin.from('profiles').upsert({ id, username: `t6_${tag}_${key}`, display_name: `T6 ${key}`, is_demo: false, discoverable: key === 'd', ...p }), `profile ${key}`);
  const c = createClient(st.API_URL, st.ANON_KEY, opts);
  const s = must(await c.auth.signInWithPassword({ email, password }), `sign in ${key}`);
  people[key] = { id, db: createClient(st.API_URL, st.ANON_KEY, { ...opts, global: { headers: { Authorization: `Bearer ${s.session.access_token}` } } }) };
}
const { a, b, c, d, e } = people; // e never joins any flock
const flocks = [];
const make = async (who, args) => { const r = await who.db.rpc('create_flock', args); if (r.error) throw new Error(r.error.message); flocks.push(r.data); return r.data; };
const join = async (who, id) => (await who.db.rpc('join_flock', { p_flock_id: id }));

try {
  // ---- the two done-when conditions ----
  let races = 0, bad = 0;
  for (let i = 0; i < 25; i++) {
    const f = await make(a, { p_name: `race ${i}`, p_kind: 'open', p_open_to_join: true, p_max_size: 2 }); // creator + ONE open seat
    await Promise.all([join(b, f), join(c, f)]);   // both send a request; the admin then answers both at once
    const [r1, r2] = await Promise.all([b, c].map((p) => a.db.rpc('answer_join_request', { p_flock_id: f, p_user_id: p.id, p_approve: true })));
    const got = [r1.data, r2.data].sort().join(',');
    races++; if (got !== 'approved,full') { bad++; console.log('   round', i, got, r1.error?.message ?? '', r2.error?.message ?? ''); }
    const n = must(await admin.from('flock_members').select('user_id').eq('flock_id', f).eq('status', 'active'), 'count');
    if (n.length !== 2) { bad++; console.log('   round', i, 'active members', n.length); }
  }
  check(bad === 0, `${races} races for the last seat: the admin approves one and the other is told full, never over max_size`);

  const secret = await make(a, { p_name: 'private', p_kind: 'friends' });
  must(await a.db.from('swipes').insert({ user_id: a.id, listing_id: must(await admin.from('listings').select('id').limit(1), 'listing')[0].id, flock_id: secret, direction: 'right' }), 'swipe');
  must(await admin.from('tours').insert({ flock_id: secret, listing_id: must(await admin.from('listings').select('id').limit(1), 'l')[0].id, starts_at: new Date(Date.now() + 864e5).toISOString(), created_by: a.id }), 'tour');
  const seen = async (who, t) => (await who.from(t).select('*').eq(t === 'flocks' ? 'id' : 'flock_id', secret)).data?.length ?? -1;
  for (const t of ['flocks', 'flock_members', 'swipes', 'tours', 'flock_votes']) {
    check((await seen(c.db, t)) === 0, `a non-member reads no ${t} of the flock`);
    check((await seen(anon, t)) === 0, `a signed-out visitor reads no ${t} of the flock`);
  }
  check((await seen(a.db, 'flocks')) === 1 && (await seen(a.db, 'flock_members')) === 1 && (await seen(a.db, 'swipes')) === 1, 'the member reads their own flock, membership and votes');
  const intrusion = await c.db.from('swipes').insert({ user_id: c.id, listing_id: (await admin.from('listings').select('id').limit(1)).data[0].id, flock_id: secret, direction: 'right' });
  check(!!intrusion.error, 'a non-member cannot vote inside the flock');
  const fake = await a.db.from('swipes').insert({ user_id: b.id, listing_id: (await admin.from('listings').select('id').limit(1)).data[0].id, flock_id: secret, direction: 'left' });
  check(!!fake.error, 'a member cannot vote as someone else');

  // ---- the rest of the behavior ----
  const friends = await make(a, { p_name: 'friends only', p_kind: 'friends' });
  const alone = (await a.db.from('flock_members').select('user_id, status').eq('flock_id', friends)).data ?? [];
  check((await a.db.from('flocks').select('id').eq('id', friends)).data?.length === 1 && alone.length === 1 && alone[0].user_id === a.id && alone[0].status === 'active', 'a new flock exists at once, with only its creator active, before anyone accepts');
  check((await join(b, friends)).data === 'closed', 'a stranger cannot join a friends flock');
  must(await admin.from('flock_members').insert({ flock_id: friends, user_id: b.id, status: 'invited', joined_via: 'invite' }), 'invite');
  check((await join(b, friends)).data === 'joined', 'an invited person joining accepts the invite');
  check((await join(b, friends)).data === 'already_member', 'joining twice is harmless');

  const rules = await make(a, { p_name: 'rules', p_kind: 'open', p_open_to_join: true, p_join_rules: { budget: true }, p_filters: { budget_min: 3000 } });
  check((await join(c, rules)).data === 'mismatch', 'a budget that fails the owner\'s rule cannot send a request');
  check((await join(b, rules)).data === 'requested', 'a budget that passes sends a request, not a membership');
  check((await b.db.rpc('answer_join_request', { p_flock_id: rules, p_user_id: b.id, p_approve: true })).error?.code === '42501', 'only an admin can approve a request');
  check((await a.db.rpc('answer_join_request', { p_flock_id: rules, p_user_id: b.id, p_approve: true })).data === 'approved', 'an admin approves the request and the person becomes a member');
  await a.db.rpc('set_flock_open', { p_flock_id: rules, p_open: false });
  check((await join(d, rules)).data === 'closed', 'a closed flock takes no requests');
  check((await c.db.rpc('set_flock_open', { p_flock_id: rules, p_open: true })).error?.code === '42501', 'only an admin can open or close a flock');

  const big = await make(a, { p_name: 'no cap', p_kind: 'open', p_open_to_join: true });
  const results = await Promise.all([b, c, d].map((p) => join(p, big)));
  check(results.every((r) => r.data === 'requested'), 'a flock with no max_size takes a request from anyone');
  const tiny = await a.db.rpc('create_flock', { p_name: 'solo', p_max_size: 1 });
  check(!!tiny.error, 'a flock of fewer than 2 is refused');

  // ---- privacy ----
  const pp = await b.db.from('public_profiles').select('*');
  check(pp.data?.every((r) => r.id === d.id && !('budget_max' in r)) && pp.data.length >= 1, 'public_profiles shows only discoverable people, and no budget');
  check(((await anon.from('public_profiles').select('*')).data?.length ?? 0) === 0, 'a signed-out visitor cannot read public_profiles');
  check(((await e.db.from('profiles').select('id').eq('id', a.id)).data?.length ?? 0) === 0, 'a person in no flock cannot read another person\'s profile (budget, habits)');
  check(((await b.db.from('profiles').select('id').eq('id', a.id)).data?.length ?? 0) === 1, 'flock mates can read each other\'s profiles');
} finally {
  for (const id of flocks) await admin.from('flocks').delete().eq('id', id);
  for (const p of Object.values(people)) { await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
