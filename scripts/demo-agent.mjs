// The ticket T12 "done when", against a REAL model, through the real routes, on the LOCAL database:
//   1. "We need 3 bedrooms under $4,700" produces a saved shortlist
//   2. rejecting an invite pauses and resumes correctly
//   3. no rent or score appears in the answer that is not in a tool result
// Costs a few cents. Start the app first:  npm run dev:local   (reads OPENAI_API_KEY from .env.local)
//   node scripts/demo-agent.mjs
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { readEvents } from '../lib/agent/client.ts';
import { inventedNumbers } from '../lib/agent/guard.ts';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st || !/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Needs the local database.'); process.exit(1); }
const BASE = process.env.BASE ?? 'http://localhost:3000';
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const tag = randomUUID().slice(0, 8), people = {};
for (const [key, budget] of Object.entries({ a: 1700, b: 1600, c: 1400, d: 1200 })) {
  const id = randomUUID(), email = `demo-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), key);
  must(await admin.from('profiles').insert({ id, username: `demo_${tag}_${key}`, display_name: `Demo ${key}`, budget_max: budget, beds_min: 1, is_demo: false }), key);
  const db = createClient(st.API_URL, st.ANON_KEY, opts);
  people[key] = { id, db, username: `demo_${tag}_${key}`, token: must(await db.auth.signInWithPassword({ email, password }), key).session.access_token };
}
const flock = must(await people.a.db.rpc('create_flock', { p_name: 'Demo flock', p_bedrooms_needed: 3 }), 'flock');
for (const k of ['b', 'c']) must(await admin.from('flock_members').insert({ flock_id: flock, user_id: people[k].id, status: 'active', joined_via: 'invite' }), k);
console.log('flock of 3, combined budget $4,700, 3 bedrooms needed\n');

const post = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${people.a.token}` }, body: JSON.stringify({ flockId: flock, ...body }) });
async function turn(path, body, label) {
  const res = await post(path, body);
  if (!res.ok || !res.body) { console.log(`   ${label}: HTTP ${res.status}`, await res.text()); return { events: [], status: res.status }; }
  const events = []; for await (const e of readEvents(res.body)) events.push(e);
  const text = events.filter((e) => e.type === 'token').map((e) => e.text).join('');
  const steps = events.filter((e) => e.type === 'step').map((e) => e.name);
  console.log(`   ${label}: steps [${steps.join(' > ')}]${events.some((e) => e.type === 'error') ? '  ERROR: ' + events.find((e) => e.type === 'error').message : ''}`);
  if (text) console.log('   answer:', text.replace(/\s+/g, ' ').slice(0, 400));
  return { events, text, status: res.status };
}

try {
  console.log('1. The demo wish');
  const t1 = await turn('/api/agent', { message: 'We need 3 bedrooms under $4,700' }, 'ask');
  const picks = must(await admin.from('shortlist').select('listing_id, explanation, added_by, listing:listings(address, price, beds)').eq('flock_id', flock), 'shortlist');
  check(picks.length >= 1 && picks.length <= 5, `a shortlist was saved (${picks.length} picks)`);
  picks.forEach((p) => console.log(`     - ${p.listing.address}: from $${p.listing.price}, ${p.listing.beds} bd | ${p.explanation}`));
  check(picks.every((p) => p.listing.beds >= 3 && p.listing.price <= 4700), 'every saved pick really has 3+ bedrooms and a starting rent within $4,700 (checked in the database)');
  check(picks.every((p) => p.added_by === 'agent' && /budget: fits/.test(p.explanation ?? '')), 'every saved pick carries an explanation built from the checks');
  const results = t1.events.filter((e) => e.type === 'tool_result').map((e) => e.content);
  const invented = inventedNumbers(t1.text ?? '', results);
  check(invented.length === 0, `no rent or score in the answer that is not in a tool result${invented.length ? ' (found: ' + invented.join(', ') + ')' : ''}`);
  await new Promise((r) => setTimeout(r, 800));
  check(must(await admin.from('agent_runs').select('id').eq('flock_id', flock), 'runs').length >= 1, 'the run was logged');

  console.log('\n2. An invite pauses; rejecting sends nothing');
  const inviteWish = `Please invite ${people.d.username} to our flock.`;
  const t2 = await turn('/api/agent', { message: inviteWish }, 'ask');
  const pause = t2.events.find((e) => e.type === 'interrupt');
  check(!!pause && pause.actions.some((a) => a.name === 'send_invites'), 'the agent paused to ask for approval');
  const before = must(await admin.from('flock_members').select('status').eq('flock_id', flock).eq('user_id', people.d.id), 'd');
  check(before.length === 0, 'nobody was invited while it waited');
  await turn('/api/agent/resume', { decisions: [{ type: 'reject', message: 'not now' }] }, 'reject');
  const afterReject = must(await admin.from('flock_members').select('status').eq('flock_id', flock).eq('user_id', people.d.id), 'd');
  check(afterReject.length === 0, 'after rejecting, still nobody invited');

  console.log('\n3. The same invite, approved');
  const t3 = await turn('/api/agent', { message: inviteWish }, 'ask again');
  if (t3.events.some((e) => e.type === 'interrupt')) await turn('/api/agent/resume', { decisions: [{ type: 'approve' }] }, 'approve');
  const afterApprove = must(await admin.from('flock_members').select('status').eq('flock_id', flock).eq('user_id', people.d.id), 'd');
  check(afterApprove[0]?.status === 'invited', 'after approving, the person is invited (not a member until they accept)');
} finally {
  await admin.from('flocks').delete().eq('id', flock);
  for (const p of Object.values(people)) { await admin.from('agent_usage').delete().eq('user_id', p.id); await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
