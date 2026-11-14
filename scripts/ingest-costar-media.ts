// Galleries for the LA communities, from the CoStar kit's property records (listing_media, source = 'costar_kit').
// The kit has real galleries (docs: kit models/commercial-property.md, attachments[]): no scraping, no permission issue.
//
//   node scripts/ingest-costar-media.ts                                  dry run: read the kit, print the report, touch no database
//   node --env-file=.env.ingest scripts/ingest-costar-media.ts --write --confirm <db-host>
//
// Run scripts/ingest-costar.ts first (it creates the communities). Idempotent; same guard rails as that script.
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { APARTMENT_FILE, extractKit, readJsonl } from '../lib/costar/kit.ts';
import { mapRecord, type KitRecord } from '../lib/costar/map.ts';
import { pickGallery, type KitAttachment } from '../lib/costar/media.ts';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const kitDir = opt('kit') ?? 'data/costar-kit';
const PROPERTY_FILE = 'data/commercial-property.jsonl';
const host = (u: string) => new URL(u).host;

for (const f of [APARTMENT_FILE, PROPERTY_FILE]) {
  if (!existsSync(`${kitDir}/${f}`)) {
    const zip = process.env.COSTAR_KIT_ZIP, pw = process.env.COSTAR_ZIP_PASSWORD;
    if (!zip || !pw) throw new Error(`No ${f} in ${kitDir}. Extract the kit there, or set COSTAR_KIT_ZIP and COSTAR_ZIP_PASSWORD.`);
    extractKit(zip, pw, kitDir, [f]);
  }
}

// Which communities, and what their primary photo is (the gallery must not repeat it).
const primary = new Map<string, string | null>();
for await (const item of readJsonl<KitRecord>(`${kitDir}/${APARTMENT_FILE}`)) {
  if ('error' in item) continue;
  const m = mapRecord(item.record);
  if ('community' in m) primary.set(m.community.costar_property_id, m.community.primary_photo_url);
}

const gallery = new Map<string, string[]>();
let scanned = 0;
for await (const item of readJsonl<{ id: number; attachments?: KitAttachment[] }>(`${kitDir}/${PROPERTY_FILE}`)) {
  if ('error' in item) continue;
  scanned++;
  const id = String(item.record.id);
  if (primary.has(id)) gallery.set(id, pickGallery(item.record.attachments, primary.get(id)));
}

const sizes = [...gallery.values()].map((g) => g.length).sort((a, b) => a - b);
const withAny = sizes.filter((n) => n > 0).length;
console.log('\nCoStar gallery report', flag('write') ? '(WRITE)' : '(dry run: no database touched)');
console.log(`  property records scanned   ${scanned}`);
console.log(`  LA communities             ${primary.size}  (${primary.size - gallery.size} without a property record)`);
console.log(`  with 1+ extra photos       ${withAny} (${((100 * withAny) / primary.size).toFixed(1)}%)`);
console.log(`  with 6+ extra photos       ${sizes.filter((n) => n >= 6).length}`);
console.log(`  photos in total            ${sizes.reduce((a, b) => a + b, 0)}   (median ${sizes[Math.floor(sizes.length / 2)] ?? 0}, max ${sizes.at(-1) ?? 0} per community)`);

if (!flag('write')) { console.log('\nDry run. To save: node --env-file=.env.ingest scripts/ingest-costar-media.ts --write --confirm <db-host>'); process.exit(0); }

const url = process.env.INGEST_SUPABASE_URL, key = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
if (opt('confirm') !== host(url)) throw new Error(`Refusing: pass --confirm ${host(url)} to write to that database.`);
const live = existsSync('.env.local') && /^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m.exec(readFileSync('.env.local', 'utf8'))?.[1]?.trim();
if (live && host(live) === host(url) && !flag('allow-live')) throw new Error(`Refusing: ${host(url)} is the project in .env.local. Use a test database, or pass --allow-live.`);

const db = createClient(url, key, { auth: { persistSession: false } });
const comms = await db.from('communities').select('id, costar_property_id').limit(5000);
if (comms.error) throw new Error(comms.error.message);
const before = (await db.from('listing_media').select('id', { count: 'exact', head: true }).eq('source', 'costar_kit')).count ?? 0;

let written = 0, missing = 0;
for (const c of comms.data!) {
  const urls = gallery.get(c.costar_property_id);
  if (!urls) { missing++; continue; }
  if (urls.length) {
    const rows = urls.map((u, i) => ({ community_id: c.id, url: u, kind: 'photo', position: i + 1, source: 'costar_kit', match_confidence: 1 }));
    const up = await db.from('listing_media').upsert(rows, { onConflict: 'community_id,url' });
    if (up.error) throw new Error(up.error.message);
    written += rows.length;
  }
  // Photos that left the gallery since the last run: remove ours (never the Apartments.com ones).
  const old = await db.from('listing_media').select('id, url').eq('community_id', c.id).eq('source', 'costar_kit');
  const stale = (old.data ?? []).filter((r) => !urls.includes(r.url)).map((r) => r.id);
  if (stale.length) await db.from('listing_media').delete().in('id', stale);
}
const after = (await db.from('listing_media').select('id', { count: 'exact', head: true }).eq('source', 'costar_kit')).count ?? 0;
console.log(`\nWriting to ${host(url)}: ${written} photo rows upserted${missing ? `, ${missing} communities not in the kit's property file` : ''}`);
console.log(`  kit photos in listing_media  ${before} -> ${after}   (run again: it should not change)`);
