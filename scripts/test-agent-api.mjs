// HTTP test for /api/agent and /api/agent/resume against a dev server on the LOCAL database (ticket T12).
//   OPENAI_API_KEY=sk-dummy AGENT_DAILY_LIMIT=3 npm run dev:local     (in another terminal; migrations-only database)
//   node scripts/test-agent-api.mjs
// A dummy key is deliberate: this checks the gates (sign-in, input, membership, daily limit, stream shape, run log), not the model.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st || !/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Needs the local database.'); process.exit(1); }
const BASE = process.env.BASE ?? 'http://localhost:3000';
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const tag = randomUUID().slice(0, 8), people = {};
for (const key of ['member', 'stranger']) {
  const id = randomUUID(), email = `t12api-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), key);
  must(await admin.from('profiles').insert({ id, username: `t12api_${tag}_${key}`, display_name: key, budget_max: 2000, is_demo: false }), key);
  const db = createClient(st.API_URL, st.ANON_KEY, opts);
  people[key] = { id, db, token: must(await db.auth.signInWithPassword({ email, password }), key).session.access_token };
}
const flock = must(await people.member.db.rpc('create_flock', { p_name: 'api test' }), 'flock');
const post = (path, who, body) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(who ? { authorization: `Bearer ${who.token}` } : {}) }, body: JSON.stringify(body) });
const lines = async (res) => (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

try {
  check((await post('/api/agent', null, { flockId: flock, message: 'hi' })).status === 401, 'no token: 401');
  check((await post('/api/agent', people.member, { flockId: 'nope', message: '' })).status === 400, 'bad input: 400');
  check((await post('/api/agent/resume', people.member, { flockId: flock, decisions: [] })).status === 400, 'resume with no decisions: 400');
  check((await post('/api/agent', people.stranger, { flockId: flock, message: 'We need 3 bedrooms under $4,700' })).status === 403, 'someone outside the flock: 403');

  const ok = await post('/api/agent', people.member, { flockId: flock, message: 'We need 3 bedrooms under $4,700' });
  check(ok.status === 200 && /ndjson/.test(ok.headers.get('content-type') ?? ''), 'a member gets an NDJSON stream');
  const ev = await lines(ok);
  check(ev.at(-1)?.type === 'done', 'the stream always ends with done');
  check(ev.some((e) => e.type === 'error') || ev.some((e) => e.type === 'token'), 'a failing model shows up as an error event, not a broken connection (dummy key)');
  await new Promise((r) => setTimeout(r, 800));
  const runs = must(await admin.from('agent_runs').select('request, user_id').eq('flock_id', flock), 'runs');
  check(runs.length === 1 && runs[0].user_id === people.member.id && /3 bedrooms/.test(runs[0].request), 'the run was logged to agent_runs with who asked and what');

  const r2 = await post('/api/agent/resume', people.member, { flockId: flock, decisions: [{ type: 'approve' }] });
  await r2.text();
  const r3 = await post('/api/agent', people.member, { flockId: flock, message: 'third' });
  await r3.text();
  const r4 = await post('/api/agent', people.member, { flockId: flock, message: 'fourth' });
  check(r3.status === 200 && r4.status === 429, `the daily limit (3 calls) lets the 3rd through and stops the 4th: got ${r3.status} then ${r4.status}`);
} finally {
  await admin.from('flocks').delete().eq('id', flock);
  for (const p of Object.values(people)) { await admin.from('agent_usage').delete().eq('user_id', p.id); await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
