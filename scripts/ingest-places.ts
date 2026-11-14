// Load the named places around LA from OpenStreetMap into the places table (docs/DESIGN.md §8.9, Ducktect's "look around"): every named shop, amenity,
// leisure place, tourist place, craft, healthcare place and transit station, plus park-like areas with their outlines. There is no category list:
// each place keeps a searchable text of its name and tags, so whatever a person asks for ("climbing", "vegan", "bookshop") can be searched.
// Nine tile requests and one for areas, to the public Overpass API, for the area the CoStar kit covers; nothing is fetched at request time afterwards.
// Data © OpenStreetMap contributors, ODbL: the app shows that credit wherever it uses it.
//
//   node scripts/ingest-places.ts                                                  dry run: ask Overpass, print what would be loaded, write nothing
//   INGEST_SUPABASE_URL=... INGEST_SUPABASE_SERVICE_ROLE_KEY=... node scripts/ingest-places.ts --write --confirm <db-host>
//   add --tiles <n> to try only the first n tiles
//
// Idempotent (upserts on the OpenStreetMap id), saves each tile as it goes, and never deletes. Local database only: any other host is refused.
// Be polite: one request at a time with pauses, an honest User-Agent (set ENRICH_CONTACT to an email or URL), and patient retries when the server is busy.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (flag(n) ? args[args.indexOf(`--${n}`) + 1] : undefined);
const write = flag('write');

// The kit's extent (lat 33.92 to 34.23, lng -118.47 to -118.18) plus a margin, so a home at the edge still sees the place next to it.
const BBOX = { south: 33.89, west: -118.5, north: 34.26, east: -118.15 };
const GRID = 3; // 3 x 3 tiles keep each Overpass answer a manageable size
const SPACING_M = 60; // an area's outline is kept with points about this far apart: distance to a park is distance to this outline
const MAX_PTS = 2500;
const MAX_AREA_M2 = 30e6; // a 1,900 km² national forest is not somewhere you walk to from home (Griffith Park is about 17 km²)
const M_PER_DEG = 111_320;

type LL = [lat: number, lng: number];
type Row = { id: string; name: string | null; kind: string; search_text: string; area_m2: number | null; lat: number; lng: number; south: number; north: number; west: number; east: number; pts: LL[]; closed: boolean };
type Geom = { lat: number; lon: number }[];
type El = { type: 'node' | 'way' | 'relation'; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string>; geometry?: Geom; members?: { type: string; role: string; geometry?: Geom }[] };

const metres = (a: LL, b: LL) => Math.hypot((b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180) * M_PER_DEG, (b[0] - a[0]) * M_PER_DEG);
const same = (a: LL, b: LL) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
const bboxOf = (pts: LL[]) => {
  const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
  return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lngs), east: Math.max(...lngs) };
};

// ---------- what a place is, in words ----------
const MAIN_KEYS = ['amenity', 'shop', 'leisure', 'tourism', 'craft', 'healthcare', 'natural', 'railway', 'public_transport', 'landuse'];
const words = (v: string | undefined) => (v ?? '').toLowerCase().replace(/[_;:,]+/g, ' ').trim();
// "climbing sports centre", "vegan restaurant", "supermarket": what it is, short enough to read in a sentence.
function describe(t: Record<string, string>): { kind: string; text: string } {
  const main = MAIN_KEYS.map((k) => t[k]).find(Boolean);
  const kind = [words(t.cuisine?.split(';')[0]), words(t.sport?.split(';')[0]), words(main)].filter(Boolean).join(' ').replace(/\s+/g, ' ') || 'place';
  const diets = Object.entries(t).filter(([k, v]) => k.startsWith('diet:') && v === 'yes').map(([k]) => k.slice(5)); // diet:vegan=yes -> "vegan"
  const text = [t.name, ...MAIN_KEYS.map((k) => t[k]), t.sport, t.cuisine, t.brand, ...diets].map(words).filter(Boolean).join(' ');
  return { kind, text: [...new Set(text.split(/\s+/))].join(' ') };
}

// Fragments of a relation's outline become closed rings by joining ends that meet; what cannot be closed stays an open outline.
function assemble(frags: LL[][]): { ring: LL[]; closed: boolean }[] {
  const left = frags.filter((f) => f.length > 1).map((f) => [...f]);
  const out: { ring: LL[]; closed: boolean }[] = [];
  while (left.length) {
    let ring = left.shift()!;
    for (let moved = true; moved && !same(ring[0]!, ring.at(-1)!); ) {
      moved = false;
      for (let i = 0; i < left.length; i++) {
        const f = left[i]!, head = ring[0]!, tail = ring.at(-1)!;
        if (same(tail, f[0]!)) ring = [...ring, ...f.slice(1)];
        else if (same(tail, f.at(-1)!)) ring = [...ring, ...[...f].reverse().slice(1)];
        else if (same(head, f.at(-1)!)) ring = [...f, ...ring.slice(1)];
        else if (same(head, f[0]!)) ring = [...[...f].reverse(), ...ring.slice(1)];
        else continue;
        left.splice(i, 1);
        moved = true;
        break;
      }
    }
    out.push({ ring, closed: ring.length > 3 && same(ring[0]!, ring.at(-1)!) });
  }
  return out;
}

function resample(line: LL[]): LL[] {
  const out: LL[] = [line[0]!];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!, n = Math.max(1, Math.ceil(metres(a, b) / SPACING_M));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  if (out.length <= MAX_PTS) return out;
  const step = out.length / MAX_PTS; // a huge outline is thinned, never cut off
  return Array.from({ length: MAX_PTS }, (_, i) => out[Math.floor(i * step)]!).concat([out.at(-1)!]);
}

function areaM2(ring: LL[]): number {
  const [lat0, lng0] = ring[0]!, k = Math.cos((lat0 * Math.PI) / 180) * M_PER_DEG;
  const p = ring.map(([la, ln]) => [(ln - lng0) * k, (la - lat0) * M_PER_DEG] as const);
  let s = 0;
  for (let i = 0; i < p.length - 1; i++) s += p[i]![0] * p[i + 1]![1] - p[i + 1]![0] * p[i]![1];
  return Math.abs(s) / 2;
}

// ---------- areas: parks, beaches, lakes and other places with an extent ----------
function areaRows(el: El): Row[] {
  const t = el.tags ?? {};
  if (t.access === 'private' || t.access === 'no') return [];
  const frags: LL[][] = el.type === 'way'
    ? [(el.geometry ?? []).map((g) => [g.lat, g.lon] as LL)]
    : (el.members ?? []).filter((m) => m.type === 'way' && m.role !== 'inner').map((m) => (m.geometry ?? []).map((g) => [g.lat, g.lon] as LL));
  const rings = assemble(frags);
  const { kind, text } = describe(t);
  return rings.flatMap(({ ring, closed }, i) => {
    if (ring.length < 2) return [];
    const area = closed ? areaM2(ring) : null;
    if ((area ?? 0) > MAX_AREA_M2) return [];
    if (!t.name && (area ?? 0) < 1500) return []; // unnamed specks are noise
    const pts = resample(ring).map(([la, ln]) => [r5(la), r5(ln)] as LL);
    const b = bboxOf(pts);
    return [{ id: `${el.type}/${el.id}${rings.length > 1 ? `#${i + 1}` : ''}`, name: t.name ?? null, kind, search_text: text, area_m2: area == null ? null : Math.round(area), lat: r5((b.south + b.north) / 2), lng: r5((b.west + b.east) / 2), ...b, pts, closed }];
  });
}

// ---------- points: every named shop, amenity and so on ----------
function pointRow(el: El): Row[] {
  const t = el.tags ?? {};
  const at = el.type === 'node' ? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null) : el.center ?? null;
  if (!at || t.access === 'private') return [];
  const p: LL = [r5(at.lat), r5(at.lon)];
  const { kind, text } = describe(t);
  return [{ id: `${el.type}/${el.id}`, name: t.name ?? null, kind, search_text: text, area_m2: null, lat: p[0], lng: p[1], south: p[0], north: p[0], west: p[1], east: p[1], pts: [p], closed: false }];
}

// ---------- ask Overpass ----------
// Named things only (an unnamed bench is no use to anyone), and not the street furniture that happens to carry an amenity tag.
const NOT_PLACES = 'bench|parking|parking_space|parking_entrance|waste_basket|bicycle_parking|post_box|recycling|toilets|vending_machine|drinking_water|shelter|fountain|clock|telephone|motorcycle_parking|waste_disposal|bbq|grave_yard|bicycle_repair_station|loading_dock|taxi|atm';
const AREA_LEISURE = 'park|nature_reserve|garden|playground|dog_park|golf_course|marina'; // kept as areas below, with outlines
const NOT_POINT_LEISURE = `pitch|swimming_pool|picnic_table|bleachers|fitness_station|firepit|bandstand|track|common|${AREA_LEISURE}`;
const tileQuery = (b: string) => `[out:json][timeout:150];(
nwr["name"]["amenity"]["amenity"!~"^(${NOT_PLACES})$"](${b});
nwr["name"]["shop"](${b});
nwr["name"]["leisure"]["leisure"!~"^(${NOT_POINT_LEISURE})$"](${b});
nwr["name"]["tourism"]["tourism"!~"^(information|viewpoint)$"](${b});
nwr["name"]["craft"](${b});
nwr["name"]["healthcare"](${b});
nwr["railway"~"^(station|halt|tram_stop)$"]["name"](${b});
node["public_transport"="station"]["name"](${b});
nwr["amenity"~"^(charging_station|bicycle_rental)$"](${b});
);out center tags;`;
// `out geom` (not `out geom tags`) for areas: with "tags" Overpass leaves out a relation's members, which silently drops every park mapped as a relation.
// The big regional parks (Griffith, Elysian, Kenneth Hahn) are leisure=nature_reserve, not leisure=park.
const { south: S, west: W, north: N, east: E } = BBOX, whole = `${S},${W},${N},${E}`;
const AREAS = `[out:json][timeout:180];(way["leisure"~"^(${AREA_LEISURE})$"](${whole});relation["leisure"~"^(${AREA_LEISURE})$"](${whole});way["natural"~"^(beach|water)$"]["name"](${whole});relation["natural"~"^(beach|water)$"]["name"](${whole});way["landuse"~"^(recreation_ground|village_green|allotments)$"](${whole}););out geom;`;
const UA = `FlockHackathonBot/1.0 (+${process.env.ENRICH_CONTACT ?? 'local development'})`;
const pause = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function overpass(query: string): Promise<El[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(300_000) });
    if (r.ok) return ((await r.json()) as { elements: El[] }).elements;
    if (![429, 502, 503, 504].includes(r.status) || attempt === 3) throw new Error(`Overpass answered ${r.status}`);
    console.log(`Overpass is busy (${r.status}); waiting 60 s and trying again.`);
    await pause(60_000);
  }
  throw new Error('unreachable');
}

const tiles = Array.from({ length: GRID * GRID }, (_, i) => {
  const r = Math.floor(i / GRID), c = i % GRID, dlat = (N - S) / GRID, dlng = (E - W) / GRID;
  return `${(S + r * dlat).toFixed(4)},${(W + c * dlng).toFixed(4)},${(S + (r + 1) * dlat).toFixed(4)},${(W + (c + 1) * dlng).toFixed(4)}`;
}).slice(0, Number(opt('tiles') ?? GRID * GRID));

// ---------- save as we go (local database only) ----------
let db: SupabaseClient | null = null;
if (write) {
  const url = process.env.INGEST_SUPABASE_URL, key = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY (the local database: supabase status).');
  const host = new URL(url).host;
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) throw new Error(`Refusing: ${host} is not a local database. This script only runs against the local Supabase.`);
  if (opt('confirm') !== host) throw new Error(`--write needs --confirm ${host} (the host repeated, so a typo cannot write somewhere else).`);
  db = createClient(url, key, { auth: { persistSession: false } });
}
async function save(rows: Row[]) {
  if (!db) return;
  for (let i = 0; i < rows.length; i += 200) {
    const r = await db.from('places').upsert(rows.slice(i, i + 200).map((x) => ({ ...x, fetched_at: new Date().toISOString() })), { onConflict: 'id' });
    if (r.error) throw new Error(`places: ${r.error.message}`);
  }
}

const t0 = Date.now(), seen = new Set<string>(), kinds = new Map<string, number>();
let total = 0;
const take = async (rows: Row[]) => {
  const fresh = rows.filter((r) => !seen.has(r.id));
  fresh.forEach((r) => (seen.add(r.id), kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1)));
  total += fresh.length;
  await save(fresh);
};

console.log(`Asking Overpass for named places in ${whole}: ${tiles.length} tiles and one request for areas${write ? ' (saving as it goes)' : ' (dry run)'} ...`);
const areas = await overpass(AREAS);
await take(areas.flatMap(areaRows));
console.log(`  areas: ${areas.length} elements -> ${total} places`);
for (const [i, tile] of tiles.entries()) {
  await pause(6_000);
  const els = await overpass(tileQuery(tile));
  const before = total;
  await take(els.flatMap(pointRow));
  console.log(`  tile ${i + 1}/${tiles.length}: ${els.length} elements -> ${total - before} new places (${total} so far, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const top = [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join(', ');
console.log(`\n${total} places in ${((Date.now() - t0) / 1000).toFixed(0)} s. Most common kinds: ${top}`);
console.log(`${kinds.size} different kinds of place.`);
if (!write) console.log('\nDry run: nothing was written. Add --write --confirm <db-host> (with INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY).');
else console.log(`The places table now holds ${(await db!.from('places').select('id', { count: 'exact', head: true })).count}.`);
