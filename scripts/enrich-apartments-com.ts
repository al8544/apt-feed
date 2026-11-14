// OPTIONAL AND NOT USED: the kit's own galleries cover T5 (scripts/ingest-costar-media.ts). Run this only after the approval
// record is filled in (docs/permissions/apartments-com.md) and with APARTMENTS_COM_ENRICH=on.
// Apartments.com galleries and details for chosen communities (docs/DESIGN.md §6.2). Offline batch job, never
// a request-time call. Hackathon use only; the approval is recorded in docs/permissions/apartments-com.md.
//
//   node scripts/enrich-apartments-com.ts                       read pages already in .cache/apartments-com/, print what they hold
//   node scripts/enrich-apartments-com.ts --fetch               also download missing pages (polite; needs ENRICH_CONTACT)
//   node --env-file=.env.ingest scripts/enrich-apartments-com.ts --write --confirm <db-host>     save to a database
//
// Which pages: data/apartments-com-overrides.json, {"<costar_property_id>": "https://www.apartments.com/..."}, a person
// matched each one by hand (so match_confidence = 1). Nothing is searched for or guessed.
// Politeness: one request at a time, a 4-8 s pause, an honest User-Agent with a contact, robots.txt respected, every
// page cached on disk. If a page asks for a CAPTCHA or blocks us, the run STOPS; we never try to get past it.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { isBlocked, parse, sameImage, type Parsed } from '../lib/enrich/apartments-com.ts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : undefined);

// Off unless someone turns it on: the team chose to ship the kit's own galleries and not scrape (ticket T5, path B).
if ((process.env.APARTMENTS_COM_ENRICH ?? 'off').toLowerCase() !== 'on') {
  console.log('APARTMENTS_COM_ENRICH is not "on": nothing to do. The app uses the kit galleries only.');
  process.exit(0);
}

const overridesFile = opt('overrides') ?? 'data/apartments-com-overrides.json';
if (!existsSync(overridesFile)) {
  console.log(`No ${overridesFile}. Create it as {"<costar_property_id>": "https://www.apartments.com/<page>/"} for the demo properties.`);
  process.exit(0);
}
const overrides = Object.entries(JSON.parse(readFileSync(overridesFile, 'utf8')) as Record<string, string>).slice(0, Number(opt('max') ?? Infinity));
const CACHE = '.cache/apartments-com';
mkdirSync(CACHE, { recursive: true });
const cachePath = (url: string) => `${CACHE}/${createHash('sha1').update(url).digest('hex')}.html`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const host = (u: string) => new URL(u).host;

// ---------- politeness ----------
const contact = process.env.ENRICH_CONTACT;
if (flag('fetch') && !contact) throw new Error('Set ENRICH_CONTACT (an email or URL where we can be reached) before fetching: the User-Agent must be honest.');
const UA = `FlockHackathonBot/1.0 (+${contact})`;

let disallowed: string[] | null = null;
async function allowedByRobots(url: string): Promise<boolean> {
  if (!disallowed) {
    const r = await fetch('https://www.apartments.com/robots.txt', { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Could not read robots.txt (${r.status}); stopping rather than guessing.`);
    disallowed = []; let applies = false;
    for (const line of (await r.text()).split('\n').map((l) => l.split('#')[0]!.trim())) {
      if (/^user-agent:/i.test(line)) applies = line.split(':')[1]!.trim() === '*';
      else if (applies && /^disallow:/i.test(line) && line.split(':')[1]!.trim()) disallowed.push(line.split(':')[1]!.trim());
    }
  }
  const path = new URL(url).pathname;
  return !disallowed.some((d) => path.startsWith(d));
}

// ---------- fetch / parse ----------
type Result = { propertyId: string; url: string; parsed?: Parsed; note?: string };
const results: Result[] = [];
let networkCalls = 0, stopped = false;

for (const [propertyId, url] of overrides) {
  if (!/^https:\/\/www\.apartments\.com\//.test(url)) { results.push({ propertyId, url, note: 'skipped: not an apartments.com https URL' }); continue; }
  const file = cachePath(url);
  let html: string | null = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (html == null) {
    if (!flag('fetch')) { results.push({ propertyId, url, note: 'not cached (run with --fetch)' }); continue; }
    if (!(await allowedByRobots(url))) { results.push({ propertyId, url, note: 'skipped: robots.txt disallows this path' }); continue; }
    if (networkCalls++) await sleep(4000 + Math.random() * 4000);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    const body = await r.text();
    if (isBlocked(r.status, body)) {
      results.push({ propertyId, url, note: `BLOCKED (HTTP ${r.status}); stopping the run, falling back to the kit photo` });
      stopped = true;
      break;
    }
    if (!r.ok) { results.push({ propertyId, url, note: `HTTP ${r.status}` }); continue; }
    writeFileSync(file, body);
    html = body;
  }
  results.push({ propertyId, url, parsed: parse(html) });
}

console.log(`\nApartments.com enrichment (${flag('write') ? 'WRITE' : 'read only'}), ${overrides.length} pages listed, ${networkCalls} downloaded`);
for (const r of results) {
  const p = r.parsed;
  console.log(`  ${r.propertyId.padEnd(10)} ${p ? `${p.photos.filter((x) => x.kind === 'photo').length} photos, ${p.photos.filter((x) => x.kind === 'floorplan').length} floor plans, pets ${p.petsAllowed ?? 'unknown'}` : r.note}`);
}
if (stopped) console.log('\nStopped at a block. Nothing past it was fetched.');

if (!flag('write')) { console.log('\nRead only. To save: node --env-file=.env.ingest scripts/enrich-apartments-com.ts --write --confirm <db-host>'); process.exit(0); }

// ---------- write (same guard rails as the ingest script) ----------
const url = process.env.INGEST_SUPABASE_URL, key = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
if (opt('confirm') !== host(url)) throw new Error(`Refusing: pass --confirm ${host(url)} to write to that database.`);
const live = existsSync('.env.local') && /^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim();
if (live && host(live) === host(url) && !flag('allow-live')) throw new Error(`Refusing: ${host(url)} is the project in .env.local. Use a test database, or pass --allow-live.`);

const db = createClient(url, key, { auth: { persistSession: false } });
let saved = 0;
for (const r of results) {
  if (!r.parsed) continue;
  const c = await db.from('communities').select('id, primary_photo_url').eq('costar_property_id', r.propertyId).maybeSingle();
  if (c.error) throw new Error(c.error.message);
  if (!c.data) { console.log(`  ${r.propertyId}: no such community in this database, skipped`); continue; }
  const fresh = r.parsed.photos.filter((m) => !(c.data!.primary_photo_url && sameImage(m.url, c.data!.primary_photo_url)));
  const rows = fresh.map((m, i) => ({
    community_id: c.data!.id, url: m.url, kind: m.kind, position: i + 1, source: 'apartments_com', source_page_url: r.url, match_confidence: 1,
  }));
  if (rows.length) {
    const up = await db.from('listing_media').upsert(rows, { onConflict: 'community_id,url' });
    if (up.error) throw new Error(up.error.message);
  }
  const en = await db.from('listing_enrichment').upsert({
    community_id: c.data.id,
    apartments_com: { petsAllowed: r.parsed.petsAllowed, amenities: r.parsed.amenities, description: r.parsed.description, pageUrl: r.url },
    last_checked: new Date().toISOString(),
  });
  if (en.error) throw new Error(en.error.message);
  saved++;
}
console.log(`\nSaved ${saved} communities to ${host(url)}. Re-running is safe: it upserts.`);
