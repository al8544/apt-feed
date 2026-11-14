// Pre-warm the aerial-evidence cache for the demo properties (docs/DESIGN.md §6.3, ticket T14). An offline batch job, never a request-time call.
//
//   node scripts/enrich-vexcel.ts                                   plan only: which communities and phrases, no network
//   node --env-file=.env.local scripts/enrich-vexcel.ts --fetch     ask Vexcel and print what it says, write nothing
//   node --env-file=.env.local scripts/enrich-vexcel.ts --fetch --write --confirm <db-host>      also save to the database
//   node --env-file=.env.local scripts/enrich-vexcel.ts --show      print the evidence already cached (no Vexcel call)
//
// Which properties: --communities <id,id,...>, or --demo <n> (default 6): the communities with the most active listings, i.e. the ones the
// demo feed shows most. Which checks: --phrases "swimming pool,tennis court,parking lot,tree cover" (the default), --buffer <m> (default 80).
// Needs VEXCEL_API_KEY for --fetch, plus INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (deliberately not the app's variable names).
// Local database only: a host that is not this machine is refused. One request at a time, a call budget (--max-calls, default 60), and the run STOPS
// on a 401, 403 or exhausted 429 instead of hammering. Cached rows are skipped, so it is safe to re-run.
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_BUFFER_M, aerialEvidence, supabaseAerialStore } from '../lib/enrich/aerial.ts';
import { canonicalPhrase, createVexcel } from '../lib/enrich/vexcel.ts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const write = flag('write'), fetchLive = flag('fetch'), show = flag('show');
const buffer = Number(opt('buffer') ?? DEFAULT_BUFFER_M);
const maxCalls = Number(opt('max-calls') ?? 60);
const phrases = (opt('phrases') ?? 'swimming pool,tennis court,parking lot,tree cover').split(',').map((p) => p.trim()).filter(Boolean);
const host = (u: string) => new URL(u).host;

const url = process.env.INGEST_SUPABASE_URL, key = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (the local database: supabase status).');
if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host(url))) throw new Error(`Refusing: ${host(url)} is not a local database. This script only runs against the local Supabase.`);
if (write && opt('confirm') !== host(url)) throw new Error(`--write needs --confirm ${host(url)} (the host repeated, so a typo cannot write somewhere else).`);
if (write && !fetchLive) throw new Error('--write saves what --fetch finds: use both.');
for (const p of phrases) if (!canonicalPhrase(p)) console.log(`(skipping "${p}": aerial imagery cannot show that)`);
const checkable = phrases.filter((p) => canonicalPhrase(p));

const db = createClient(url, key, { auth: { persistSession: false } });
const store = supabaseAerialStore(db);

// ---------- which communities ----------
type C = { id: string; name: string | null; lat: number; lng: number };
async function pick(): Promise<C[]> {
  const ids = opt('communities')?.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids?.length) {
    const r = await db.from('communities').select('id, name, lat, lng').in('id', ids);
    if (r.error) throw new Error(`communities: ${r.error.message}`);
    return (r.data as (Omit<C, 'lat' | 'lng'> & { lat: number | null; lng: number | null })[]).filter((c): c is C => c.lat != null && c.lng != null);
  }
  // The API returns at most 1000 rows per request, so count page by page (a single select would silently miss most listings).
  const n = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const r = await db.from('listings').select('community_id').eq('active', true).not('community_id', 'is', null).order('id').range(from, from + 999);
    if (r.error) throw new Error(`listings: ${r.error.message}`);
    for (const l of r.data as { community_id: string }[]) n.set(l.community_id, (n.get(l.community_id) ?? 0) + 1);
    if (r.data.length < 1000) break;
  }
  const top = [...n].sort((a, b) => b[1] - a[1]).slice(0, Number(opt('demo') ?? 6)).map(([id]) => id);
  const c = await db.from('communities').select('id, name, lat, lng').in('id', top);
  if (c.error) throw new Error(`communities: ${c.error.message}`);
  return top.map((id) => (c.data as C[]).find((x) => x.id === id)).filter((x): x is C => !!x && x.lat != null && x.lng != null);
}

const communities = await pick();
console.log(`${show ? 'Showing' : fetchLive ? 'Checking' : 'Plan for'} ${communities.length} communities in ${host(url)}, checks: ${checkable.join(', ')}, search square ${2 * buffer} m, budget ${maxCalls} calls\n`);
if (!fetchLive && !show) {
  for (const c of communities) console.log(`  ${c.name ?? c.id}  (${c.lat.toFixed(5)}, ${c.lng.toFixed(5)})`);
  console.log('\nPlan only: nothing was sent to Vexcel. Add --fetch to look, and --write --confirm <db-host> to save.');
  process.exit(0);
}

// ---------- run ----------
// --fetch without --write must not change the database, so it reads the cache through a store that cannot write.
const readOnly = { ...store, saveQueries: async () => {}, saveAttributes: async () => {} };
const budget = { calls: maxCalls };
const vexcel = fetchLive ? createVexcel() : undefined;
if (fetchLive && !process.env.VEXCEL_API_KEY) throw new Error('Set VEXCEL_API_KEY (server and scripts only) before --fetch.');

const STOP = new Set(['no_key', 'unauthorized', 'forbidden', 'rate_limited']); // not worth trying the next community
const tally = { cache: 0, live: 0, unavailable: 0, found: 0, not_seen: 0 };
let stopped: string | null = null;
for (const c of communities) {
  const evidence = await aerialEvidence(c, checkable, {
    store: write ? store : show ? store : readOnly, vexcel, bufferM: buffer, budget,
    onFailure: (call, reason) => { console.log(`   ! ${call} failed: ${reason}`); if (STOP.has(reason)) stopped = reason; },
  });
  console.log(`${c.name ?? c.id}`);
  for (const e of evidence) {
    console.log(`   ${e.phrase.padEnd(14)} ${e.status.padEnd(12)} ${e.source ?? '-'}${e.confidence != null ? `  conf ${e.confidence.toFixed(2)}` : ''}${e.imagery?.capturedAt ? `  imagery ${e.imagery.capturedAt}` : ''}`);
    if (e.source === 'cache') tally.cache++; else if (e.source === 'live') tally.live++;
    if (e.status === 'unavailable') tally.unavailable++;
    if (e.status === 'found') tally.found++; else if (e.status === 'not_seen') tally.not_seen++;
  }
  if (stopped) { console.log(`\nStopping rather than hammering Vexcel (${stopped}). 401: the key; 403: outside the key's area (LA and Houston only); 429: too many requests.`); break; }
  if (fetchLive && budget.calls <= 0) { console.log('\nCall budget used up (--max-calls). Stopping.'); break; }
}
console.log(`\n${tally.found} found, ${tally.not_seen} not seen, ${tally.unavailable} unavailable | from cache ${tally.cache}, from Vexcel ${tally.live} | Vexcel calls used: ${maxCalls - Math.max(budget.calls, 0)}`);
if (fetchLive && !write) console.log('Nothing was saved (add --write --confirm <db-host>).');
