// Integration test for the agent's database side (ticket T12) against the LOCAL Supabase only: the user-scoped store, the shortlist,
// invites, the daily limit and the run log, all under row-level security.   node scripts/test-agent-db.mjs
// Needs the migrations only (supabase db reset), because the privacy checks mean nothing once dev-open-access.sql is applied.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseStore } from '../lib/agent/store.ts';

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

const tag = randomUUID().slice(0, 8), people = {};
for (const [key, budget] of Object.entries({ a: 2000, b: 1800, c: 1500, d: 1000 })) {
  const id = randomUUID(), email = `t12-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), `create ${key}`);
  must(await admin.from('profiles').insert({ id, username: `t12_${tag}_${key}`, display_name: `T12 ${key}`, budget_max: budget, is_demo: false }), `profile ${key}`);
  const db = createClient(st.API_URL, st.ANON_KEY, opts);
  must(await db.auth.signInWithPassword({ email, password }), `sign in ${key}`);
  people[key] = { id, db, username: `t12_${tag}_${key}`, store: supabaseStore(db) };
}
const { a, b, c, d } = people; // a and b are in the flock, c is a stranger, d gets invited
let flock, listing;
try {
  listing = must(await admin.from('listings').insert({ source: 'costar', address: `T12 ${tag} Test St`, neighborhood: null, price: 3300, beds: 3, baths: 2, lat: 34.05, lng: -118.25 }).select('id'), 'listing')[0].id;
  flock = must(await a.db.rpc('create_flock', { p_name: 't12', p_max_size: 3 }), 'flock');
  must(await admin.from('flock_members').insert({ flock_id: flock, user_id: b.id, status: 'active', joined_via: 'invite' }), 'add b');

  // the user-scoped store, as the agent uses it
  const needs = await a.store.flockNeeds(flock);
  check(needs.size === 2 && needs.members.reduce((s, m) => s + (m.budgetMax ?? 0), 0) === 3800, 'the store reads the flock and its members\' budgets as the caller (combined $3,800)');
  const found = await a.store.searchPlans({ maxRent: 3400, beds: 3, limit: 5 });
  check(found.some((p) => p.id === listing && p.rentMin === 3300), 'search_apartments reads floor plans as the caller');
  check((await a.store.searchPlans({ maxRent: 3000, beds: 3, limit: 5 })).every((p) => p.id !== listing), 'the rent filter excludes a plan that is too expensive');

  const saved = await a.store.saveShortlist(flock, [{ listingId: listing, explanation: 'budget: fits', criteria: [{ key: 'budget', ok: true, detail: 'fits' }] }]);
  check(saved === 1 && (await b.store.shortlist(flock)).length === 1, 'a member saves to the shortlist and the other member reads it');
  check((await c.store.shortlist(flock)).length === 0, 'a stranger reads nothing of the flock\'s shortlist');
  const intrusion = await c.db.from('shortlist').insert({ flock_id: flock, listing_id: listing, explanation: 'x' });
  check(!!intrusion.error, 'a stranger cannot write to the flock\'s shortlist');

  await b.store.recordFeedback(flock, b.id, listing, 'too far');
  check((await a.store.shortlist(flock))[0].status === 'contested', 'feedback marks the pick contested for everyone');
  check(((await anon.from('flock_feedback').select('id').eq('flock_id', flock)).data?.length ?? 0) === 0, 'feedback is not readable outside the flock');

  // invites: the person must be a member to invite, and the invitee is never made a member
  check((await a.store.invite(flock, d.username)) === 'invited', 'a member invites someone by username');
  check((await a.store.invite(flock, d.username)) === 'already_invited', 'inviting twice is harmless');
  check((await a.store.invite(flock, 'nobody_' + tag)) === 'no_such_user', 'an unknown username is reported, not invented');
  const outsider = await c.db.rpc('invite_to_flock', { p_flock_id: flock, p_username: c.username });
  check(!!outsider.error, 'someone outside the flock cannot invite');
  const members = must(await admin.from('flock_members').select('user_id, status').eq('flock_id', flock).eq('user_id', d.id), 'd');
  check(members[0]?.status === 'invited', 'the invitee is only invited: they are not a member until they accept');
  check((await d.db.rpc('join_flock', { p_flock_id: flock })).data === 'joined', 'the invitee accepts with join_flock');
  const e = await a.store.invite(flock, c.username);
  check(e === 'full', 'invites respect max_size (3 of 3)');

  // the daily limit
  const takes = []; for (let i = 0; i < 4; i++) takes.push((await c.db.rpc('take_agent_call', { p_daily_limit: 3 })).data);
  check(takes.join() === 'true,true,true,false', 'the 4th call of the day is refused when the limit is 3');
  check((await d.db.rpc('take_agent_call', { p_daily_limit: 3 })).data === true, 'the limit is per person');
  check(!!(await anon.rpc('take_agent_call', { p_daily_limit: 3 })).error, 'a signed-out visitor cannot spend agent calls');
  check(((await c.db.from('agent_usage').select('*')).data?.length ?? 0) === 0, 'nobody can read the usage table directly');

  // the run log
  const mine = await a.db.from('agent_runs').insert({ flock_id: flock, user_id: a.id, request: 'We need 3 bedrooms', steps: ['apartment-searcher'], result_summary: 'ok' });
  check(!mine.error, 'a member logs their own run');
  check(!!(await a.db.from('agent_runs').insert({ flock_id: flock, user_id: b.id, request: 'x' })).error, 'a member cannot log a run as someone else');
  check(!!(await c.db.from('agent_runs').insert({ flock_id: flock, user_id: c.id, request: 'x' })).error, 'a stranger cannot log a run into the flock');
  check(((await b.db.from('agent_runs').select('id').eq('flock_id', flock)).data?.length ?? 0) === 1, 'flock members can read the run log');
  check(((await c.db.from('agent_runs').select('id').eq('flock_id', flock)).data?.length ?? 0) === 0, 'strangers cannot');
} finally {
  if (flock) await admin.from('flocks').delete().eq('id', flock);
  if (listing) await admin.from('listings').delete().eq('id', listing);
  for (const p of Object.values(people)) { await admin.from('agent_usage').delete().eq('user_id', p.id); await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
