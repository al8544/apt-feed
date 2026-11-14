// Reading a wish (docs/DESIGN.md §8.9, ticket T15). The model reads the person (their real profile) and what they typed, works out what their
// day-to-day life needs, and describes it as hard FILTERS the listing data can apply and CHECKS: each a need, why it matters to this person, and how to
// look for it: what is AROUND a home (search terms in the model's own words) and/or what should be visible FROM ABOVE (labels for the satellite detector).
// Nothing here is a category list: any need the model can put into words is allowed. normalizeInterpretation() holds the model's reading to the rules
// (safe terms, sensible limits, only things imagery can show) and ruleSplit() is the no-model fallback (no key, model down), a plain keyword reading.
// Pure: no database, no network.
import { LA_AREAS } from '../flocks.ts';
import { MAX_IMAGERY_LABELS, canonicalPhrase } from '../enrich/vexcel.ts';
import { isReach, sanitizeTerms, type Around } from '../enrich/places.ts';
import type { Viewport } from './store.ts';

export type Hard = { maxRent?: number; beds?: number; minBaths?: number; minSqft?: number; pets?: boolean; areas: string[] };
// One thing that matters to this person. `source` says whether they asked for it or it was inferred from who they are.
export type Check = { need: string; why: string; source: 'wish' | 'profile'; around?: Around; imagery?: string[] };
export type Interpreted = { hard: Hard; checks: Check[]; notChecked: string[]; lifestyle: string | null };

export const imageryLabels = (i: Interpreted) => [...new Set(i.checks.flatMap((c) => c.imagery ?? []))];
export const aroundChecks = (i: Interpreted) => i.checks.filter((c): c is Check & { around: Around } => !!c.around);

export const MAX_CHECKS = 5; // a person's day cannot be searched on twenty things at once; the model chooses what matters most

// shortcut: the kit has no neighborhoods (0 of 6,543 plans), so a named area is a box around its centre, not a boundary. Approximate
// centres from public maps; replace with real neighborhood polygons when the kit or a geocoder provides them.
const AREA_CENTERS: Record<string, [lat: number, lng: number]> = {
  'Silver Lake': [34.0869, -118.2702], 'Echo Park': [34.0782, -118.2606], 'Los Feliz': [34.1067, -118.284], Koreatown: [34.0618, -118.3009],
  Hollywood: [34.0928, -118.3287], Downtown: [34.0407, -118.2468], 'Culver City': [34.0211, -118.3965], 'Highland Park': [34.1114, -118.1927],
  'Santa Monica': [34.0195, -118.4912], Venice: [33.985, -118.4695],
};
export const KNOWN_AREAS = LA_AREAS.filter((a) => a in AREA_CENTERS);
export const areaViewport = (area: string): Viewport | null => {
  const c = AREA_CENTERS[area];
  return c ? { south: c[0] - 0.025, north: c[0] + 0.025, west: c[1] - 0.03, east: c[1] + 0.03 } : null; // about 5.5 km x 5 km
};
// The box covering every named area (or null when none can be placed).
export function viewportFor(areas: string[]): Viewport | null {
  const boxes = areas.map(areaViewport).filter((v): v is Viewport => !!v);
  if (!boxes.length) return null;
  return { south: Math.min(...boxes.map((b) => b.south)), north: Math.max(...boxes.map((b) => b.north)), west: Math.min(...boxes.map((b) => b.west)), east: Math.max(...boxes.map((b) => b.east)) };
}
const areaByName = (s: string) => KNOWN_AREAS.find((a) => a.toLowerCase() === s.trim().toLowerCase()) ?? null;
// "Koreatown" for a home within about 4 km of its centre; null when it is nowhere we can name.
export function areaLabel(lat: number, lng: number): string | null {
  let best: [string, number] | null = null;
  for (const [name, [la, ln]] of Object.entries(AREA_CENTERS)) {
    const d = Math.hypot((ln - lng) * Math.cos((lat * Math.PI) / 180) * 111_320, (la - lat) * 111_320);
    if (!best || d < best[1]) best = [name, d];
  }
  return best && best[1] <= 4000 ? best[0] : null;
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ').slice(0, n) : '');
const dedupe = (xs: string[]) => [...new Set(xs.filter(Boolean))];

// ---------- holding the model's reading to the rules ----------
export type RawInterpretation = {
  lifestyle?: string | null;
  hard?: { maxRent?: number | null; beds?: number | null; minBaths?: number | null; minSqft?: number | null; pets?: boolean | null; areas?: string[] | null };
  checks?: { need?: string; why?: string | null; source?: string | null; around?: { terms?: string[] | null; without?: string[] | null; reach?: string | null; want?: string | null } | null; imagery?: string[] | null }[] | null;
  notChecked?: string[] | null;
};

export function normalizeInterpretation(raw: RawInterpretation): Interpreted {
  const notChecked: string[] = (raw.notChecked ?? []).map((s) => clip(s, 60));
  const used = new Set<string>(); // imagery labels already taken: each is extra work for the detector, so a few are allowed in all
  const checks: Check[] = [];
  for (const c of raw.checks ?? []) {
    const need = clip(c.need, 80);
    if (!need) continue;
    const terms = sanitizeTerms(c.around?.terms ?? []);
    const without = sanitizeTerms(c.around?.without ?? []).slice(0, 4);
    const around: Around | undefined = terms.length ? { terms, ...(without.length ? { without } : {}), reach: isReach(c.around?.reach) ? c.around!.reach as Around['reach'] : 'walk', want: c.around?.want === 'away' ? 'away' : 'near' } : undefined;
    const imagery: string[] = [];
    for (const l of c.imagery ?? []) {
      const label = canonicalPhrase(l); // null: a feeling, something indoors, or a number: imagery cannot show it
      if (label && !imagery.includes(label) && (used.has(label) || used.size < MAX_IMAGERY_LABELS)) { imagery.push(label); used.add(label); }
    }
    if (!around && !imagery.length) { notChecked.push(need); continue; } // nothing to look at it with: say so, never guess
    if (checks.length >= MAX_CHECKS) { notChecked.push(need); continue; }
    checks.push({ need, why: clip(c.why, 160), source: c.source === 'profile' ? 'profile' : 'wish', ...(around ? { around } : {}), ...(imagery.length ? { imagery } : {}) });
  }
  const areas: string[] = [];
  for (const a of raw.hard?.areas ?? []) {
    const known = areaByName(a);
    if (known) areas.push(known);
    else if (clip(a, 40)) notChecked.push(`${clip(a, 40)} (area not recognized)`);
  }
  const { maxRent, beds, minBaths, minSqft, pets } = raw.hard ?? {};
  return {
    hard: {
      ...(Number.isFinite(maxRent) && maxRent! >= 500 && maxRent! <= 100_000 ? { maxRent: Math.round(maxRent!) } : {}),
      ...(Number.isInteger(beds) && beds! >= 0 && beds! <= 10 ? { beds: beds! } : {}),
      ...(Number.isFinite(minBaths) && minBaths! >= 1 && minBaths! <= 10 ? { minBaths: minBaths! } : {}),
      ...(Number.isFinite(minSqft) && minSqft! >= 200 && minSqft! <= 10_000 ? { minSqft: Math.round(minSqft!) } : {}),
      ...(pets ? { pets: true } : {}),
      areas: dedupe(areas),
    },
    checks,
    notChecked: dedupe(notChecked).slice(0, 8),
    lifestyle: clip(raw.lifestyle, 240) || null,
  };
}

// ---------- the no-model reading: keywords, nothing clever ----------
// What the model does with judgement, this does with a short word list, so Ducktect still answers with no key. It reads what was typed, not the person.
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const num = (s: string, k?: string) => Math.round(parseFloat(s.replace(/,/g, '')) * (k ? 1000 : 1));

function rentOf(t: string): number | undefined {
  // Next to a budget word, or with a $ sign / k: a bare number is more likely bedrooms or a count.
  const m =
    /\b(?:under|below|less than|up to|max(?:imum)?|at most|budget(?: of)?|around|about)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i.exec(t) ??
    /\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i.exec(t) ??
    /\b(\d+(?:\.\d+)?)\s*(k)\b/i.exec(t);
  if (!m) return undefined;
  const n = num(m[1]!, m[2]);
  return n >= 500 ? n : undefined;
}
function bedsOf(t: string): number | undefined {
  if (/\bstudio\b/i.test(t)) return 0;
  const m = /\b(\d+|one|two|three|four|five|six)[\s-]*(?:bed(?:room)?s?|br|bd)\b/i.exec(t);
  if (!m) return undefined;
  const n = WORDS[m[1]!.toLowerCase()] ?? parseInt(m[1]!, 10);
  return n >= 0 && n <= 10 ? n : undefined;
}

type Rule = { re: RegExp; need: string; why: string; around?: Omit<Around, 'want'>; imagery?: string[] };
const RULES: Rule[] = [
  { re: /\b(?:swimming pools?|pools?)\b/i, need: 'a swimming pool', why: 'asked for a pool', imagery: ['swimming pool'] },
  { re: /\btennis(?: courts?)?\b/i, need: 'a tennis court', why: 'asked for tennis', imagery: ['tennis court'] },
  { re: /\bbasketball\b/i, need: 'a basketball court', why: 'asked for basketball', imagery: ['basketball court'] },
  { re: /\bsolar\b/i, need: 'solar panels', why: 'asked for solar', imagery: ['solar panels'] },
  { re: /\b(?:rooftop|roof deck)\b/i, need: 'a rooftop deck', why: 'asked for a rooftop', imagery: ['rooftop deck'] },
  { re: /\bparking lots?\b/i, need: 'a parking lot', why: 'asked for parking', imagery: ['parking lot'] },
  { re: /\b(?:trees?|tree cover|tree canopy|greenery|shade|leafy)\b/i, need: 'trees and greenery', why: 'asked for greenery', imagery: ['tree cover'] },
  { re: /\b(?:yard|backyard|garden|lawn|outdoor space|outside space)\b/i, need: 'outdoor space to use', why: 'wants somewhere to be outside', around: { terms: ['park', 'garden', 'playground'], reach: 'walk' }, imagery: ['tree cover'] },
  { re: /\b(?:parks?|green space|playgrounds?)\b(?!ing)/i, need: 'a park', why: 'asked for a park', around: { terms: ['park', 'playground'], reach: 'walk' } },
  { re: /\b(?:coffee|cafes?)\b/i, need: 'coffee nearby', why: 'asked for cafes', around: { terms: ['cafe', 'coffee'], reach: 'walk' } },
  { re: /\b(?:gyms?|fitness|workout|yoga)\b/i, need: 'a gym', why: 'asked for fitness', around: { terms: ['gym', 'fitness', 'yoga'], reach: 'bike' } },
  { re: /\b(?:groceries|grocery|supermarkets?)\b/i, need: 'groceries', why: 'asked for groceries', around: { terms: ['supermarket', 'grocery'], reach: 'walk' } },
  { re: /\b(?:restaurants?|dining)\b/i, need: 'restaurants', why: 'asked for places to eat', around: { terms: ['restaurant'], reach: 'walk' } },
  { re: /\b(?:bars?|nightlife|pubs?|clubs?)\b/i, need: 'nightlife', why: 'asked for going out', around: { terms: ['bar', 'pub', 'nightclub'], reach: 'walk' } },
  { re: /\b(?:transit|metro|subway|train|commute)\b/i, need: 'easy transit', why: 'asked about getting around', around: { terms: ['station', 'metro', 'subway'], reach: 'walk' } },
  { re: /\blibrar(?:y|ies)\b/i, need: 'a library', why: 'asked for a library', around: { terms: ['library'], reach: 'walk' } },
  { re: /\bpharmac(?:y|ies)\b/i, need: 'a pharmacy', why: 'asked for a pharmacy', around: { terms: ['pharmacy'], reach: 'walk' } },
  { re: /\b(?:hospital|clinic|urgent care)\b/i, need: 'healthcare nearby', why: 'asked for healthcare', around: { terms: ['hospital', 'clinic', 'urgent care'], reach: 'drive' } },
  { re: /\bschools?\b/i, need: 'schools', why: 'asked for schools', around: { terms: ['school'], reach: 'walk' } },
  { re: /\bbeach\b/i, need: 'the beach', why: 'asked for the beach', around: { terms: ['beach'], reach: 'bike' } },
  { re: /\bdog parks?\b/i, need: 'a dog park', why: 'asked for a dog park', around: { terms: ['dog park'], reach: 'walk' } },
  { re: /\b(?:mall|shopping)\b/i, need: 'shopping nearby', why: 'asked for shopping', around: { terms: ['mall', 'shopping'], reach: 'walk' } },
  { re: /\bwalkable\b/i, need: 'errands on foot', why: 'asked for walkable', around: { terms: ['supermarket', 'cafe', 'pharmacy'], reach: 'walk' } },
];
// Wishes nobody can check from data or imagery: named, not guessed.
const UNCHECKABLE = ['quiet', 'safe', 'sunny', 'bright', 'modern', 'spacious', 'cozy', 'luxury', 'clean', 'friendly', 'vibe', 'noise', 'dishwasher', 'laundry'];
const AWAY = /\b(?:away from|not near|avoid|far from|no)\s+(?:the\s+)?$/i;

export function ruleSplit(text: string): Interpreted {
  const t = text.trim();
  // Place names and the pet phrase are taken out first: "Echo Park" is not a park, "pet friendly" is not "friendly".
  const rest = KNOWN_AREAS.reduce((s, a) => s.replace(new RegExp(`\\b${a}\\b`, 'gi'), ' '), t).replace(/\b(?:pet|dog|cat)[- ]friendly\b/gi, ' ');
  const hits = RULES.flatMap((r) => {
    const m = r.re.exec(rest);
    return m ? [{ r, at: m.index, away: AWAY.test(rest.slice(Math.max(0, m.index - 20), m.index)) }] : [];
  }).sort((a, b) => a.at - b.at);
  const seen = new Set<string>();
  const checks = hits.flatMap(({ r, away }) => {
    if (seen.has(r.need)) return [];
    seen.add(r.need);
    return [{ need: away ? `away from ${r.need}` : r.need, why: r.why, source: 'wish' as const, ...(r.around ? { around: { ...r.around, want: away ? ('away' as const) : ('near' as const) } } : {}), ...(r.imagery ? { imagery: r.imagery } : {}) }];
  });
  return normalizeInterpretation({
    hard: { maxRent: rentOf(t), beds: bedsOf(t), pets: /\bpet[- ]friendly\b|\bpets?\b|\bdogs?\b|\bcats?\b/i.test(t) || null, areas: KNOWN_AREAS.filter((a) => new RegExp(`\\b${a}\\b`, 'i').test(t)) },
    checks,
    notChecked: UNCHECKABLE.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(rest)).sort((a, b) => rest.search(new RegExp(`\\b${a}\\b`, 'i')) - rest.search(new RegExp(`\\b${b}\\b`, 'i'))),
  });
}
