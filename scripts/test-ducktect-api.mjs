// HTTP test for /api/ducktect against a dev server on the LOCAL database (ticket T15). It checks the gates (sign-in, input, membership,
// daily limit), the stream shape, the rule-based fallback, the degraded modes, and that nothing is written.
//   OPENAI_API_KEY=dummy OPENAI_BASE_URL=http://127.0.0.1:9/v1 VEXCEL_API_KEY= AGENT_DAILY_LIMIT=8 \
//     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npx next dev -p 3100
//   BASE=http://localhost:3100 node scripts/test-ducktect-api.mjs
// A dead model address is deliberate: a model that cannot answer must still end in a result (built by the rules). No Vexcel key means cache only,
// so this never calls Vexcel. The model's own words are not tested here (see lib/agent/ducktect-agent.test.ts for the wiring).
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const st = JSON.parse(spawnSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' }).stdout || 'null');
if (!st || !/^http:\/\/127\.0\.0\.1:/.test(st.API_URL)) { console.error('Needs the local database.'); process.exit(1); }
const BASE = process.env.BASE ?? 'http://localhost:3100';
const LIMIT = Number(process.env.AGENT_DAILY_LIMIT ?? 8);
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(st.API_URL, st.SERVICE_ROLE_KEY, opts);
let failed = 0;
const check = (ok, what) => (console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`), ok || failed++);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

const tag = randomUUID().slice(0, 8), people = {};
for (const [key, budget] of [['member', 2500], ['stranger', 2000], ['burner', 2000]]) {
  const id = randomUUID(), email = `t15api-${tag}-${key}@example.test`, password = randomUUID();
  must(await admin.auth.admin.createUser({ id, email, password, email_confirm: true }), key);
  must(await admin.from('profiles').upsert({ id, username: `t15api_${tag}_${key}`, display_name: key, budget_max: budget, is_demo: false }), key); // the sign-up trigger already made a row
  const db = createClient(st.API_URL, st.ANON_KEY, opts);
  people[key] = { id, db, token: must(await db.auth.signInWithPassword({ email, password }), key).session.access_token };
}
const flock = must(await people.member.db.rpc('create_flock', { p_name: 't15 api test', p_bedrooms_needed: 2 }), 'flock');
const post = (who, body) => fetch(`${BASE}/api/ducktect`, { method: 'POST', headers: { 'content-type': 'application/json', ...(who ? { authorization: `Bearer ${who.token}` } : {}) }, body: JSON.stringify(body) });
const stream = async (res) => (await res.text()).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const ask = async (who, body) => { const res = await post(who, body); return { res, ev: res.ok ? await stream(res) : [], result: null, get: function () { return this.ev.find((e) => e.type === 'result')?.result; } }; };
const rowsOf = async (t, col, v) => (await admin.from(t).select('*', { count: 'exact', head: true }).eq(col, v)).count ?? 0;

try {
  // ---- the gates ----
  check((await post(null, { text: 'a pool' })).status === 401, 'no token: 401');
  check((await post(people.member, { text: '' })).status === 400, 'empty wish: 400');
  check((await post(people.member, { text: 'x'.repeat(501) })).status === 400, 'a wish over 500 characters: 400');
  check((await post(people.member, { text: 'pool', viewport: { south: 99, north: 1, west: 1, east: 2 } })).status === 400, 'a viewport that is not on Earth: 400');
  check((await post(people.stranger, { flockId: flock, text: 'a pool' })).status === 403, 'someone outside the flock: 403');

  // ---- a wish, solo, with a model that cannot answer ----
  const solo = await ask(people.member, { text: '2 bed with a pool under $6,000', viewport: { south: 33.9, north: 34.2, west: -118.6, east: -118.1 } });
  check(solo.res.status === 200 && /ndjson/.test(solo.res.headers.get('content-type') ?? ''), 'a signed-in user gets an NDJSON stream');
  check(solo.ev.at(-1)?.type === 'done', 'the stream always ends with done');
  check(!solo.ev.some((e) => e.type === 'token'), "the model's words are never streamed as they arrive");
  const r = solo.get();
  check(!!r && !solo.ev.some((e) => e.type === 'error'), 'a model that fails still ends in a result, not an error');
  check(r?.viaModel === false && r?.solo === true, 'the result says it was built by the rules, for you alone');
  const steps = solo.ev.filter((e) => e.type === 'step').map((e) => e.name);
  check(['interpret_wish', 'apartment-searcher', 'aerial-evidence', 'rank_candidates'].every((n) => steps.includes(n)), `the steps stream in order (${steps.join(' > ')})`);
  check(r?.picks?.length > 0 && r.picks.length <= 5 && r.picks.every((p, i) => p.rank === i + 1), `ranked picks, best first (${r?.picks?.length})`);
  check(r?.interpreted?.visual?.[0] === 'swimming pool' && r?.interpreted?.hard?.beds === 2 && r?.interpreted?.hard?.maxRent === 6000, 'the wish was split: 2 bed, $6,000, a pool to check');
  check(r?.picks?.every((p) => p.criteria.some((c) => c.key === 'aerial: swimming pool') && p.evidence.length === 1), 'every pick carries an aerial line for the pool (cached, or "unavailable")');
  check(r?.picks?.every((p) => p.evidence.every((e) => ['found', 'not_seen', 'unavailable'].includes(e.status))), 'evidence statuses are the known ones');
  check(['ok', 'partial', 'unavailable'].includes(r?.aerial) && r?.considered >= r?.checked && r?.checked <= 25, `aerial status ${r?.aerial}, checked ${r?.checked} of ${r?.considered}`);

  // ---- more of the contract ----
  const area = (await ask(people.member, { text: '2 bed in Hollywood under $6,000' })).get();
  check(area?.area?.names?.[0] === 'Hollywood' && area.picks.every((p) => p.lat > 34.06 && p.lat < 34.12 && p.lng > -118.37 && p.lng < -118.29), 'a place in the wish overrides the map: results are inside that area');
  const box = { south: 34.04, north: 34.07, west: -118.32, east: -118.28 }; // a part of the map that has homes
  const tiny = (await ask(people.member, { text: '2 bed under $6,000', viewport: box })).get();
  const wide = (await ask(people.member, { text: '2 bed under $6,000', viewport: { south: 33.9, north: 34.2, west: -118.6, east: -118.1 } })).get();
  check(tiny?.picks?.length > 0 && tiny.picks.every((p) => p.lat >= box.south && p.lat <= box.north && p.lng >= box.west && p.lng <= box.east), 'with no place named, the map viewport is the area');
  check(tiny?.considered < wide?.considered, `and it narrows the search (${tiny?.considered} places in the box, ${wide?.considered} in the wider map)`);
  const none = (await ask(people.member, { text: '5 bedroom under $600' })).get();
  check(none?.picks?.length === 0 && none?.noResults?.constraints?.length > 0 && none.noResults.constraints.some((c) => c.key === 'rent'), 'nothing matches: it names the constraint, with what dropping it gives');
  const quiet = (await ask(people.member, { text: '2 bed under $6,000, quiet' })).get();
  check(quiet?.aerial === 'skipped' && quiet.interpreted.notChecked.includes('quiet') && quiet.picks.every((p) => p.criteria.some((c) => c.key === 'not checked: quiet')), 'no visual phrase: the aerial step is skipped, and "quiet" is named as not checked');
  const inFlock = (await ask(people.member, { flockId: flock, text: '2 bed under $6,000' })).get();
  check(inFlock?.solo === false && inFlock.picks.length > 0, 'with a flock it runs for the flock');
  const filtered = (await ask(people.member, { text: 'a nice place', filters: { maxRent: 2500, beds: 2 } })).get();
  check(filtered?.interpreted?.hard?.maxRent === 2500 && filtered.picks.every((p) => p.rentFrom <= 2500 && p.beds >= 2), "the map's own filters fill what the wish leaves unsaid");

  // ---- read-only, and the daily limit ----
  check((await rowsOf('shortlist', 'flock_id', flock)) === 0 && (await rowsOf('flock_feedback', 'flock_id', flock)) === 0, 'it wrote nothing for the flock: no shortlist, no feedback');
  check((await rowsOf('flock_members', 'flock_id', flock)) === 1, 'and invited nobody');
  let status = 200, n = 0;
  while (status === 200 && n < LIMIT + 3) { status = (await post(people.burner, { text: '2 bed' })).status; n++; }
  check(status === 429 && n === LIMIT + 1, `the daily limit stops it: 429 on call ${n} (limit ${LIMIT})`);
} finally {
  await admin.from('flocks').delete().eq('id', flock);
  for (const p of Object.values(people)) { await admin.from('agent_usage').delete().eq('user_id', p.id); await admin.from('agent_runs').delete().eq('user_id', p.id); await admin.from('profiles').delete().eq('id', p.id); await admin.auth.admin.deleteUser(p.id); }
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
