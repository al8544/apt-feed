// Reading a wish (docs/DESIGN.md §8.9, ticket T15). A wish splits three ways: HARD filters the data can apply (rent, beds, pets, a named area),
// VISUAL phrases aerial imagery can check (lib/enrich/vexcel.ts), and NOT CHECKABLE wishes ("quiet"), which are named, never guessed.
// Two callers: the model proposes a split and normalizeInterpretation() holds it to these rules; ruleSplit() is the no-model fallback
// (no key, model down) and the baseline the tests pin down. Pure: no database, no network.
import { LA_AREAS } from '../flocks.ts';
import { canonicalPhrase } from '../enrich/vexcel.ts';
import type { Viewport } from './store.ts';

export type Hard = { maxRent?: number; beds?: number; pets?: boolean; areas: string[] };
export type Interpreted = { hard: Hard; visual: string[]; notChecked: string[] };

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

const clean = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 60);
const dedupe = (xs: string[]) => [...new Set(xs.filter(Boolean))];

// ---------- holding a proposed split to the rules ----------
export type RawInterpretation = { hard?: { maxRent?: number | null; beds?: number | null; pets?: boolean | null; areas?: string[] | null }; visual?: string[] | null; notChecked?: string[] | null };

export function normalizeInterpretation(raw: RawInterpretation): Interpreted {
  const notChecked: string[] = (raw.notChecked ?? []).map(clean);
  const visual: string[] = [];
  for (const v of raw.visual ?? []) {
    const canon = canonicalPhrase(v);
    if (canon) visual.push(canon);
    else notChecked.push(clean(v)); // a "visual" phrase imagery cannot show (park, yard, sunny) is a wish we cannot check
  }
  const areas: string[] = [];
  for (const a of raw.hard?.areas ?? []) {
    const known = areaByName(a);
    if (known) areas.push(known);
    else if (clean(a)) notChecked.push(`${clean(a)} (area not recognized)`);
  }
  const { maxRent, beds, pets } = raw.hard ?? {};
  return {
    hard: {
      ...(Number.isFinite(maxRent) && maxRent! >= 500 && maxRent! <= 100_000 ? { maxRent: Math.round(maxRent!) } : {}),
      ...(Number.isInteger(beds) && beds! >= 0 && beds! <= 10 ? { beds: beds! } : {}),
      ...(pets ? { pets: true } : {}),
      areas: dedupe(areas),
    },
    visual: dedupe(visual),
    notChecked: dedupe(notChecked).slice(0, 8),
  };
}

// ---------- the no-model splitter ----------
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

// What imagery can show (becomes `visual`), and what it cannot (becomes `notChecked`). Each entry: a pattern and the phrase it means.
const VISUAL: [RegExp, string][] = [
  [/\b(?:swimming pools?|pools?)\b/i, 'swimming pool'],
  [/\btennis(?: courts?)?\b/i, 'tennis court'],
  [/\bparking lots?\b/i, 'parking lot'],
  [/\b(?:trees?|tree cover|tree canopy|greenery)\b/i, 'tree cover'],
];
const UNCHECKABLE: [RegExp, string][] = [
  [/\bnear (?:a |the )?park\b|\bpark\b(?!ing)/i, 'park nearby'],
  [/\b(?:shopping|mall)\b/i, 'shopping center nearby'],
  [/\b(?:large |big )?(?:yard|garden)\b/i, 'large yard'],
  ...['quiet', 'safe', 'walkable', 'sunny', 'bright', 'modern', 'spacious', 'cozy', 'luxury', 'clean', 'friendly', 'vibe', 'noise', 'transit', 'gym', 'laundry', 'dishwasher'].map((w): [RegExp, string] => [new RegExp(`\\b${w}\\b`, 'i'), w]),
];

export function ruleSplit(text: string): Interpreted {
  const t = text.trim();
  // Wishes are read from what is left once place names and the pet phrase are taken out: "Echo Park" is not a park, "pet friendly" is not "friendly".
  const rest = KNOWN_AREAS.reduce((s, a) => s.replace(new RegExp(`\\b${a}\\b`, 'gi'), ' '), t).replace(/\b(?:pet|dog|cat)[- ]friendly\b/gi, ' ');
  const at = (re: RegExp) => rest.search(re);
  const inOrder = (hits: [number, string][]) => hits.filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  return normalizeInterpretation({
    hard: {
      maxRent: rentOf(t), beds: bedsOf(t), pets: /\bpet[- ]?friendly\b|\bpets?\b|\bdogs?\b|\bcats?\b/i.test(t) || null,
      areas: KNOWN_AREAS.filter((a) => new RegExp(`\\b${a}\\b`, 'i').test(t)),
    },
    visual: inOrder(VISUAL.map(([re, p]) => [at(re), p])),
    notChecked: inOrder(UNCHECKABLE.map(([re, p]) => [at(re), p])),
  });
}
