// What is around a home? (docs/DESIGN.md §8.9, Ducktect's "look around".) A person can ask for anything and the model works out what in their day-to-day
// life it implies, so there is no list of categories here: the model describes what to look for in its own words (terms like "climbing", "vegan",
// "hospital"), and this searches every named place in the OpenStreetMap data that scripts/ingest-places.ts loaded (names and tags) and measures how far
// each is. No network call at request time. Distance is to a place's OUTLINE, not its centre: a home beside the edge of a big park is next to it.
// Map data is incomplete and a word can match more than it means, so the evidence names what matched and says "on the map data" when nothing did.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Evidence } from './aerial.ts';

export type Place = { id: string; name: string | null; kind: string; areaM2: number | null; pts: [lat: number, lng: number][]; closed: boolean };
export type Bounds = { south: number; west: number; north: number; east: number };

// How far "around" reaches. The model picks per need: a cafe is a walk, a gym or a commute may be a ride, a hospital may be a drive.
export type Reach = 'walk' | 'bike' | 'drive';
export const REACH_M: Record<Reach, number> = { walk: 800, bike: 2500, drive: 6000 };
const MIN_PER_KM: Record<Reach, number> = { walk: 12.5, bike: 4, drive: 2.5 }; // about 5 km/h on foot, 15 km/h by bike, 24 km/h in city traffic
export const REACH_WORDS: Record<Reach, string> = { walk: 'a ten-minute walk', bike: 'a ten-minute bike ride', drive: 'a fifteen-minute drive' };
export const tighter = (r: Reach): Reach | null => (r === 'drive' ? 'bike' : r === 'bike' ? 'walk' : null);
export const isReach = (r: unknown): r is Reach => r === 'walk' || r === 'bike' || r === 'drive';

// ---------- the model's words, made safe to search ----------
// A term is a short phrase of letters ("climbing", "vegan", "urgent care"). Anything else (punctuation, long text) is dropped before it can reach a query.
// Words that describe a feeling or a quality, not something with a name on a map: "quiet" is not a place, so it cannot be looked for around a home.
const NOT_A_PLACE = new Set([
  'quiet', 'calm', 'peaceful', 'residential', 'safe', 'nice', 'good', 'great', 'best', 'close', 'near', 'nearby', 'walkable', 'cozy', 'modern', 'clean', 'cheap', 'affordable',
  'family', 'friendly', 'vibe', 'lively', 'busy', 'noisy', 'dark', 'bright', 'sunny', 'spacious', 'neighborhood', 'area', 'place', 'places', 'the', 'and', 'for',
]);
export function sanitizeTerm(t: string): string | null {
  const words = t.toLowerCase().replace(/[^a-z0-9 -]+/g, ' ').replace(/-/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
  return words.length && words.length <= 3 && !words.every((w) => NOT_A_PLACE.has(w)) ? words.join(' ') : null;
}
export const sanitizeTerms = (ts: string[]): string[] => [...new Set(ts.map(sanitizeTerm).filter((x): x is string => !!x))].slice(0, 6);

// A Postgres tsquery: each term's words must all start a word in the place's text (so "climb" finds "climbing"); the terms are alternatives; and
// anything matching a `without` term is left out ("hospital" but not "veterinary": a free-word search always over-matches somewhere).
const phrase = (t: string) => t.split(' ').map((w) => `${w}:*`).join(' & ');
export function tsQuery(terms: string[], without: string[] = []): string | null {
  const clean = sanitizeTerms(terms);
  if (!clean.length) return null;
  const base = clean.map(phrase).join(' | ');
  const out = sanitizeTerms(without).slice(0, 4);
  return out.length ? `(${base}) & ${out.map((t) => `!(${phrase(t)})`).join(' & ')}` : base;
}

// ---------- geometry ----------
const M_PER_DEG = 111_320;
// Local flat map around a point: metres east and north of it. Fine over the few kilometres this is used for.
const project = (lat0: number, lat: number, lng: number, lng0: number): [number, number] => [(lng - lng0) * Math.cos((lat0 * Math.PI) / 180) * M_PER_DEG, (lat - lat0) * M_PER_DEG];

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inside(px: number, py: number, ring: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!, [xj, yj] = ring[j]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Metres from a home to the place: 0 inside it, otherwise to the nearest bit of its outline (or to the point, for a shop).
export function distanceTo(lat: number, lng: number, place: Place): number {
  const ring = place.pts.map(([la, ln]) => project(lat, la, ln, lng));
  if (!ring.length) return Infinity;
  if (ring.length === 1) return Math.hypot(ring[0]![0], ring[0]![1]);
  if (place.closed && ring.length > 2 && inside(0, 0, ring)) return 0;
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) best = Math.min(best, segmentDistance(0, 0, ring[i]![0], ring[i]![1], ring[i + 1]![0], ring[i + 1]![1]));
  return best;
}

export function withinReach(lat: number, lng: number, places: Place[], reach: Reach): { place: Place; meters: number }[] {
  return places.map((place) => ({ place, meters: distanceTo(lat, lng, place) })).filter((x) => x.meters <= REACH_M[reach]).sort((a, b) => a.meters - b.meters);
}

// ---------- the evidence line for one need ----------
export type Around = { terms: string[]; reach: Reach; want: 'near' | 'away'; without?: string[] }; // without: words that must NOT match
const away = (m: number, reach: Reach) => (m < 50 ? 'right next door' : `about ${Math.round(m / 50) * 50} m away, a ${Math.max(1, Math.round((m / 1000) * MIN_PER_KM[reach]))}-minute ${reach === 'walk' ? 'walk' : reach === 'bike' ? 'ride' : 'drive'}`);
const label = (p: Place) => (p.name ? `${p.name} (${p.kind})` : `A ${p.kind}`);

// `phrase` is the need as the person would say it; it labels the line. Status is about what was FOUND: for "away" needs a find is the bad news,
// and the caller reads it that way.
export function surroundingsEvidence(phrase: string, around: Around, lat: number, lng: number, places: Place[], loaded: boolean): Evidence {
  const base = { phrase, confidence: null, imagery: null, source: 'osm' } as const;
  if (!loaded) return { ...base, status: 'unavailable', text: 'Nearby-places data unavailable.', source: null };
  const near = withinReach(lat, lng, places, around.reach);
  if (!near.length) {
    const shown = around.terms.slice(0, 3).map((t) => `"${t}"`).join(', ');
    return { ...base, status: 'not_seen', text: `Nothing matching ${shown}${around.terms.length > 3 ? ` or ${around.terms.length - 3} similar` : ''} within ${REACH_WORDS[around.reach]} on the map data.` };
  }
  const { place, meters } = near[0]!;
  const more = near.length > 1 ? ` ${near.length - 1} more within ${REACH_WORDS[around.reach]}.` : '';
  return { ...base, status: 'found', meters: Math.round(meters), text: `${label(place)} is ${away(meters, around.reach)}.${more}` };
}

// ---------- storage: an interface so tests need no database (the same pattern as lib/agent/store.ts and lib/enrich/aerial.ts) ----------
export interface PlaceStore {
  // Every place inside `bounds` that matches any of the terms: one query for a whole set of candidates, distances are worked out here.
  search(bounds: Bounds, terms: string[], without?: string[]): Promise<{ places: Place[]; loaded: boolean }>; // loaded: the table has data at all
}

type Row = { id: string; name: string | null; kind: string; area_m2: number | null; pts: [number, number][]; closed: boolean };
const toPlace = (r: Row): Place => ({ id: r.id, name: r.name, kind: r.kind, areaM2: r.area_m2, pts: r.pts, closed: r.closed });
const PAGE = 1000; // the API returns at most this many rows per request, whatever limit is asked for, so a common term has to be paged through
const MAX_ROWS = 30_000; // a term that matches more than this across the whole area is too broad to be a need ("a", "shop"); the rest is not read

export function supabasePlaceStore(db: SupabaseClient): PlaceStore {
  let loaded: boolean | null = null; // once the table is known to have rows it stays that way for this request
  return {
    async search(b, terms, without) {
      const q = tsQuery(terms, without);
      if (!q) return { places: [], loaded: true };
      const rows: Row[] = [];
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const r = await db.from('places').select('id, name, kind, area_m2, pts, closed').textSearch('search_tsv', q, { config: 'simple' })
          .lte('south', b.north).gte('north', b.south).lte('west', b.east).gte('east', b.west).order('id').range(from, from + PAGE - 1);
        if (r.error) throw new Error(`places: ${r.error.message}`);
        rows.push(...(r.data as Row[]));
        if (r.data.length < PAGE) break;
      }
      if (loaded !== true) {
        const c = await db.from('places').select('id', { count: 'exact', head: true });
        if (c.error) throw new Error(`places: ${c.error.message}`);
        loaded = (c.count ?? 0) > 0;
      }
      return { places: rows.map(toPlace), loaded };
    },
  };
}

// For tests: matches a place when every word of some term starts a word of its name or kind (the same rule the database applies).
export function memoryPlaceStore(places: (Place & { text?: string })[]): PlaceStore {
  return {
    async search(_b, terms, without) {
      const clean = sanitizeTerms(terms), out = sanitizeTerms(without ?? []);
      const matches = (words: string[], t: string) => t.split(' ').every((w) => words.some((x) => x.startsWith(w)));
      const hit = (p: Place & { text?: string }) => {
        const words = `${p.name ?? ''} ${p.kind} ${p.text ?? ''}`.toLowerCase().split(/[^a-z0-9]+/);
        return clean.some((t) => matches(words, t)) && !out.some((t) => matches(words, t));
      };
      return { places: places.filter(hit), loaded: places.length > 0 };
    },
  };
}
