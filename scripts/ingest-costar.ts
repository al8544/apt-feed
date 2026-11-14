// Ingest the CoStar apartment-listing kit into communities + listings (docs/DESIGN.md §6.1, ticket T3).
//
//   node scripts/ingest-costar.ts                      dry run: read the kit, print the report, touch no database
//   node --env-file=.env.ingest scripts/ingest-costar.ts --write --confirm <db-host>
//
// Idempotent (upserts on the CoStar ids), safe to re-run, never deletes: plans missing from the kit get active = false.
// Writing needs INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (deliberately not the app's variable names),
// the host repeated on the command line, and refuses the project in .env.local unless --allow-live is passed.
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { apartmentFile, extractKit, readJsonl } from '../lib/costar/kit.ts';
import { mapRecord, type CommunityRow, type KitRecord, type ListingRow } from '../lib/costar/map.ts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const kitDir = opt('kit') ?? 'data/costar-kit';
const limit = flag('limit') ? Number(opt('limit')) : Infinity;
const write = flag('write');

const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '–');
const host = (u: string) => new URL(u).host;

// ---------- read and map ----------
if (!existsSync(apartmentFile(kitDir))) {
  const zip = process.env.COSTAR_KIT_ZIP, pw = process.env.COSTAR_ZIP_PASSWORD;
  if (!zip || !pw) throw new Error(`No kit at ${kitDir}. Put it there, or set COSTAR_KIT_ZIP and COSTAR_ZIP_PASSWORD.`);
  extractKit(zip, pw, kitDir);
}

let read = 0, bad = 0;
const skipped = new Map<string, number>(), planSkips = new Map<string, number>();
const communities: CommunityRow[] = [], listings: (ListingRow & { property: string })[] = [];
const seenProperty = new Set<string>();
let dupes = 0, zeroPlan = 0, withPhoto = 0, withRent = 0;

for await (const item of readJsonl<KitRecord>(apartmentFile(kitDir))) {
  if (read >= limit) break;
  read++;
  if ('error' in item) { bad++; bump(skipped, `unreadable line: ${item.error}`); continue; }
  const m = mapRecord(item.record);
  if ('skipped' in m) { bump(skipped, m.skipped); continue; }
  if (seenProperty.has(m.community.costar_property_id)) { dupes++; continue; } // the kit says propertyId is unique; check anyway
  seenProperty.add(m.community.costar_property_id);
  communities.push(m.community);
  m.skippedPlans.forEach((r) => bump(planSkips, r));
  if (!m.listings.length) zeroPlan++;
  if (m.community.primary_photo_url) withPhoto++;
  for (const l of m.listings) listings.push({ ...l, property: m.community.costar_property_id });
  if (m.listings.length) withRent++;
}

const plans = listings.length + [...planSkips.values()].reduce((a, b) => a + b, 0);
console.log('\nCoStar ingest report', write ? '(WRITE)' : '(dry run: no database touched)');
console.log(`  records read              ${read}${bad ? `  (${bad} unreadable)` : ''}`);
console.log(`  records skipped           ${read - communities.length - dupes}`);
for (const [r, n] of [...skipped].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(5)}  ${r}`);
console.log(`  communities mapped        ${communities.length}${dupes ? `  (${dupes} duplicate property ids ignored)` : ''}`);
console.log(`      with a photo          ${withPhoto} (${pct(withPhoto, communities.length)})`);
console.log(`      with 1+ usable plans  ${withRent} (${pct(withRent, communities.length)}); ${zeroPlan} have none`);
console.log(`  floor plans in those      ${plans}`);
console.log(`      mapped to listings    ${listings.length} (${pct(listings.length, plans)})`);
for (const [r, n] of [...planSkips].sort((a, b) => b[1] - a[1])) console.log(`      skipped ${String(n).padStart(5)}  ${r}`);
const per = new Map<string, number>(); listings.forEach((l) => bump(per, l.property));
const counts = [...per.values()].sort((a, b) => a - b);
if (counts.length) console.log(`  plans per community       min ${counts[0]}, median ${counts[Math.floor(counts.length / 2)]}, max ${counts.at(-1)}`);
const rents = listings.map((l) => l.price).sort((a, b) => a - b);
if (rents.length) console.log(`  rent (price = rent_min)   min $${rents[0]}, median $${rents[Math.floor(rents.length / 2)]}, max $${rents.at(-1)}`);
const odd = listings.filter((l) => l.rent_min < 500 || l.rent_max > 3 * l.rent_min).length;
if (odd) console.log(`  rents that look like kit typos (min < $500, or max > 3x min): ${odd}, kept as given`);

if (!write) {
  console.log('\nDry run. To load a database: node --env-file=.env.ingest scripts/ingest-costar.ts --write --confirm <db-host>');
  process.exit(0);
}

// ---------- write ----------
const url = process.env.INGEST_SUPABASE_URL, key = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
if (opt('confirm') !== host(url)) throw new Error(`Refusing: pass --confirm ${host(url)} to write to that database.`);
const liveEnv = existsSync('.env.local') && /^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim();
if (liveEnv && host(liveEnv) === host(url) && !flag('allow-live'))
  throw new Error(`Refusing: ${host(url)} is the project in .env.local (the app's). Use a test database, or pass --allow-live if you really mean it.`);
if (limit !== Infinity) console.log('(--limit set: the deactivation step is skipped)');

const db = createClient(url, key, { auth: { persistSession: false } });
const ok = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return (r.data ?? []) as T;
};
const count = async () => (await db.from('listings').select('id', { count: 'exact', head: true }).eq('source', 'costar')).count ?? 0;
const chunks = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

console.log(`\nWriting to ${host(url)}`);
const before = { communities: (await db.from('communities').select('id', { count: 'exact', head: true })).count ?? 0, listings: await count() };

const idByProperty = new Map<string, string>();
for (const part of chunks(communities, 200)) {
  const rows = ok(await db.from('communities').upsert(part, { onConflict: 'costar_property_id' }).select('id, costar_property_id'), 'communities');
  rows.forEach((r) => idByProperty.set(r.costar_property_id, r.id));
}
const keep = new Set<string>();
for (const part of chunks(listings, 500)) {
  const rows = part.map(({ property, ...l }) => ({ ...l, community_id: idByProperty.get(property)! }));
  ok(await db.from('listings').upsert(rows, { onConflict: 'community_id,costar_floorplan_id' }), 'listings');
  rows.forEach((r) => keep.add(`${r.community_id}|${r.costar_floorplan_id}`));
}

let deactivated = 0;
if (limit === Infinity) {
  // Plans that were in an earlier kit but not this one: hide, never delete.
  const stale: string[] = [];
  for (let from = 0; ; from += 1000) {
    const page = ok(await db.from('listings').select('id, community_id, costar_floorplan_id').eq('source', 'costar').eq('active', true).range(from, from + 999), 'scan');
    page.forEach((r) => !keep.has(`${r.community_id}|${r.costar_floorplan_id}`) && stale.push(r.id));
    if (page.length < 1000) break;
  }
  for (const part of chunks(stale, 200)) ok(await db.from('listings').update({ active: false }).in('id', part), 'deactivate');
  deactivated = stale.length;
}

const after = { communities: (await db.from('communities').select('id', { count: 'exact', head: true })).count ?? 0, listings: await count() };
console.log(`  communities  ${before.communities} -> ${after.communities}`);
console.log(`  listings     ${before.listings} -> ${after.listings}   (${deactivated} newly inactive)`);
console.log('  Run it again: both numbers should not change.');
