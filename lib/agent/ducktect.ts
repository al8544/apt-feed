// Ducktect best option: the work behind the search bar's "Ducktect best option" (docs/DESIGN.md §8.9, ticket T15).
// The agent reads the person (their real profile) and the wish, works out what a good day-to-day life looks like for them, and then:
//   1. SCOUT: looks at what is around every candidate place for the things that life needs (search terms the model chose, any words at all),
//      and shortlists the places whose surroundings serve it;
//   2. CONFIRM: re-affirms the shortlist from above with satellite imagery and property data (Vexcel), for what should be visible from above;
//   3. RANK and EXPLAIN: ranks, and gives each pick a rationale in terms of this person's day.
// All of it is code over the database, the map data and Vexcel; the model decides WHAT to look for and writes the rationale, and every number it
// may quote comes from the result built here. Read-only: nothing in this file writes flock data.
import { closestMisses, fit } from '../match/listing-fit.ts';
import { combinedBudget } from '../match/rent-split.ts';
import type { Criterion, Fit } from '../match/types.ts';
import { aerialEvidence, type AerialStore, type Evidence } from '../enrich/aerial.ts';
import { REACH_M, tighter, surroundingsEvidence, type Place, type PlaceStore, type Reach } from '../enrich/places.ts';
import type { Reason, Vexcel } from '../enrich/vexcel.ts';
import { inventedNumbers } from './guard.ts';
import { areaLabel, aroundChecks, imageryLabels, normalizeInterpretation, ruleSplit, viewportFor, type Check, type Interpreted, type RawInterpretation } from './ducktect-split.ts';
import type { AgentStore, CandidateQuery, Needs, Plan, Viewport } from './store.ts';

// ---------- how places are scored (documented weights, §8.9 step 6) ----------
// score = (passes every hard check ? PASS : 0) + fit % (0 to 100) + for each thing the person needs: when it is found, FOUND_FLOOR plus the rest of FOUND
// the closer it is (so nearer is better, not just "within reach"), NOT_SEEN when it is not, and for something to stay AWAY from: minus that when it is near,
// +AWAY_CLEAR when it is not + EXTRA_BED per bedroom above the number asked for.
// The same weights apply to what the satellite confirms. "Not seen" only nudges: imagery and map data are incomplete, so absence never eliminates a
// place. "Unavailable" counts for nothing either way.
export const WEIGHTS = { pass: 1000, found: 25, foundFloor: 10, notSeen: -5, awayClear: 10, extraBed: -4 } as const;
export const MAX_PLACES = 300; // places whose surroundings are examined (the map data is local, so this is cheap)
export const SHORTLIST = 12; // places the satellite re-checks (Vexcel is the costly call, so only the best by surroundings and fit)
export const MAX_PICKS = 5;
export const ALSO_CONSIDERED = 3;
const FETCH_LIMIT = 500; // plans pulled from the database before narrowing to places

export type DucktectPick = {
  rank: number;
  floorPlanId: string; communityId: string | null; community: string | null; address: string; area: string | null; // area: the named neighborhood it sits in, if any
  rentFrom: number; beds: number; baths: number; sqft: number | null; lat: number | null; lng: number | null;
  passes: boolean; fitPct: number; score: number;
  criteria: Criterion[]; // every hard check, each need (around and from above), and each wish nobody can check
  evidence: Evidence[];
  why?: string; // the model's rationale for this person, kept only if every number in it is in the result
  tradeOff?: string;
};
export type Constraint = { key: 'rent' | 'beds' | 'pets' | 'area'; detail: string; ifRelaxed: number }; // "dropping this would give N places"
export type DucktectResult = {
  interpreted: Interpreted;
  picks: DucktectPick[];
  alsoConsidered: { floorPlanId: string; address: string; community: string | null; rentFrom: number; fitPct: number }[];
  considered: number; // places that passed the hard filters
  checked: number; // places whose surroundings were examined (at most MAX_PLACES)
  shortlisted: number; // places the satellite re-checked
  truncated: boolean; // more matching plans existed than were pulled, so "considered" is a floor
  surroundings: 'ok' | 'partial' | 'unavailable' | 'skipped'; // skipped: nothing in the wish needed looking around for
  aerial: 'ok' | 'partial' | 'unavailable' | 'skipped'; // skipped: nothing needed confirming from above
  aerialPlaces: number; // of the shortlist, how many got any satellite answer (cached or live); the rest read "unavailable"
  tightened: { need: string; from: Reach; to: Reach }[]; // needs that nearly every home met at the reach the model chose, so the reach was narrowed to tell places apart
  unverified: string[]; // satellite labels that no shortlisted place showed: the detector may not recognise them, so they were not used to rank
  undistinguishing: string[]; // satellite labels shown at nearly every shortlisted place, and needs that nearly every candidate meets: no help telling places apart, so not used to rank either
  noResults: { constraints: Constraint[]; closest: { floorPlanId: string; address: string; relax: string[] }[] } | null;
  area: { names: string[]; viewport: Viewport } | null; // a named place overrides the map: the map should move there
  solo: boolean; // no flock: you are a flock of one
  viaModel: boolean;
  dailyLife?: string; // the model's reading of how this person's day would go, as an assumption
  summary?: string; // the model's headline, kept only if every number in it is in the result
};

// ---------- one request's state, and what it may use ----------
export type DucktectEnv = {
  store: AgentStore;
  aerialStore: AerialStore;
  places?: PlaceStore; // what is around a place (OpenStreetMap, local); leave out and every "around" need reads unavailable
  vexcel?: Vexcel; // leave out for cache only
  budget: { calls: number }; // Vexcel calls this request may make
  userId: string;
  flockId?: string | null;
  viewport?: Viewport | null; // what the map shows; used when the wish names no place
  defaults?: { maxRent?: number; beds?: number; pets?: boolean }; // the map's own filters, used where the wish says nothing
  onFailure?: (reason: Reason) => void;
};
type Candidate = { key: string; plan: Plan; fit: Fit; around: Evidence[]; scout: number }; // around: one evidence per "around" check, in order
export type Rationale = { dailyLife?: string | null; picks?: { rank: number; why?: string | null; tradeOff?: string | null }[] };
export type DucktectSession = {
  interpreted: Interpreted | null;
  needs: Needs | null;
  candidates: { items: Candidate[]; considered: number; truncated: boolean; viewport: Viewport | null } | null;
  noResultsConstraints: Constraint[] | null;
  scouted: boolean;
  shortlist: Candidate[] | null;
  surroundingsFailed: boolean;
  flatNeeds: string[]; // needs that nearly every candidate meets even within a walk, so they cannot tell places apart (not used to rank)
  tightened: { need: string; from: Reach; to: Reach }[];
  reach: Reach[]; // the reach actually used for each "around" check (the model's, or narrower when that met nearly everyone)
  evidence: Map<string, Evidence[]> | null; // the satellite's answers for the shortlist, by place key
  aerialIssue: Reason | null;
  result: DucktectResult | null;
  viaModel: boolean;
};
export const newSession = (viaModel: boolean): DucktectSession => ({
  interpreted: null, needs: null, candidates: null, noResultsConstraints: null, scouted: false, shortlist: null, surroundingsFailed: false, flatNeeds: [], tightened: [], reach: [], evidence: null, aerialIssue: null, result: null, viaModel,
});

// ---------- 1. interpret ----------
export function interpret(env: DucktectEnv, s: DucktectSession, raw: RawInterpretation | string): Interpreted {
  const base = typeof raw === 'string' ? ruleSplit(raw) : normalizeInterpretation(raw);
  const d = env.defaults ?? {};
  // The wish wins; the map's filters only fill what it left unsaid.
  s.interpreted = { ...base, hard: { ...base.hard, ...(base.hard.maxRent == null && d.maxRent != null ? { maxRent: d.maxRent } : {}), ...(base.hard.beds == null && d.beds != null ? { beds: d.beds } : {}), ...(!base.hard.pets && d.pets ? { pets: true } : {}) } };
  s.needs = s.candidates = s.shortlist = s.evidence = s.result = null;
  s.scouted = s.surroundingsFailed = false;
  s.flatNeeds = [];
  s.tightened = [];
  s.reach = [];
  return s.interpreted;
}

// ---------- needs: your flock, or you alone ----------
async function needsFor(env: DucktectEnv, hard: Interpreted['hard']): Promise<Needs> {
  const base = env.flockId ? await env.store.flockNeeds(env.flockId) : await env.store.soloNeeds(env.userId);
  return {
    ...base,
    // A rent in the wish is the combined budget (T12 prompt): one synthetic member carries it, so fit() reads it as the budget.
    members: hard.maxRent != null ? [{ userId: env.userId, status: 'active' as const, budgetMax: hard.maxRent }] : base.members,
    bedroomsNeeded: hard.beds ?? base.bedroomsNeeded,
    needsPets: !!hard.pets || base.needsPets,
    areas: [], // the kit has no neighborhoods, so an area is a map box (viewport), not a per-plan check
  };
}

// With no budget anywhere (no rent in the wish, none on the profile) the budget check is "unknown", not a fail on every place.
function withoutBudget(f: Fit): Fit {
  const criteria = f.criteria.map((c) => (c.key === 'budget' ? { ...c, ok: null, detail: 'no budget given' } : c));
  const known = criteria.filter((c) => c.ok !== null);
  return { ...f, criteria, passes: criteria.every((c) => c.ok !== false), fitPct: known.length ? Math.round((100 * known.filter((c) => c.ok).length) / known.length) : 0 };
}

const placeKey = (p: Plan) => p.communityId ?? p.id;
const unavailable = (phrase: string): Evidence => ({ phrase, status: 'unavailable', text: 'Nearby-places data unavailable.', confidence: null, imagery: null, source: null });

// ---------- 2a. find candidates: every place that passes the hard filters ----------
export async function findCandidates(env: DucktectEnv, s: DucktectSession) {
  if (s.candidates) return s.candidates;
  const interpreted = s.interpreted ?? interpret(env, s, '');
  const hard = interpreted.hard;
  const needs = (s.needs ??= await needsFor(env, hard));
  const noBudget = hard.maxRent == null && combinedBudget(needs.members) === 0;
  const named = viewportFor(hard.areas);
  const viewport = named ?? env.viewport ?? null; // area precedence: a place in the text beats the map
  const q: CandidateQuery = { maxRent: hard.maxRent ?? (combinedBudget(needs.members) || undefined), beds: hard.beds, pets: hard.pets, viewport: viewport ?? undefined, limit: FETCH_LIMIT };

  const { plans: pulled, total } = await env.store.findCandidates(q);
  // What the database cannot filter: bathrooms and size. An unknown size is not "too small".
  const plans = pulled.filter((p) => (hard.minBaths == null || p.baths >= hard.minBaths) && (hard.minSqft == null || p.sqft == null || p.sqft >= hard.minSqft));
  const scored = plans.map((plan) => ({ plan, fit: noBudget ? withoutBudget(fit(plan, needs)) : fit(plan, needs) }));
  // Bedrooms above what was asked count against a plan (here and in rank()).
  const extra = (c: { plan: Plan }) => (hard.beds != null ? Math.max(0, c.plan.beds - hard.beds) : 0);
  const better = (a: { plan: Plan; fit: Fit }, b: { plan: Plan; fit: Fit }) => Number(a.fit.passes) - Number(b.fit.passes) || a.fit.fitPct - b.fit.fitPct || extra(b) - extra(a) || b.plan.rentMin - a.plan.rentMin; // > 0: a is the better plan
  // One place, one candidate: its best plan. The map data and Vexcel both look at a place, not a floor plan.
  const best = new Map<string, { plan: Plan; fit: Fit }>();
  for (const c of scored) {
    const cur = best.get(placeKey(c.plan));
    if (!cur || better(c, cur) > 0) best.set(placeKey(c.plan), c);
  }
  const places = [...best.values()].sort((a, b) => better(b, a));
  s.candidates = {
    items: places.slice(0, MAX_PLACES).map((c) => ({ key: placeKey(c.plan), plan: c.plan, fit: c.fit, around: [], scout: 0 })),
    considered: places.length, truncated: total > pulled.length, viewport,
  };
  if (!places.length) s.noResultsConstraints = await explainNothing(env, q, hard);
  return s.candidates;
}

// Nothing matched: say which constraint did it, by dropping each in turn and counting what comes back (§8.9 "No results").
async function explainNothing(env: DucktectEnv, q: CandidateQuery, hard: Interpreted['hard']): Promise<Constraint[]> {
  const tries: [Constraint['key'], string, Partial<CandidateQuery>][] = [];
  if (q.maxRent != null) tries.push(['rent', `under $${q.maxRent.toLocaleString('en-US')}`, { maxRent: undefined }]);
  if (q.beds != null) tries.push(['beds', `${q.beds === 0 ? 'a studio' : `${q.beds}+ bedrooms`}`, { beds: undefined }]);
  if (q.pets) tries.push(['pets', 'pets allowed', { pets: undefined }]);
  if (q.viewport && (hard.areas.length || env.viewport)) tries.push(['area', hard.areas.length ? `in ${hard.areas.join(' or ')}` : 'in this part of the map', { viewport: undefined }]);
  const out: Constraint[] = [];
  for (const [key, detail, drop] of tries) {
    const { total } = await env.store.findCandidates({ ...q, ...drop, limit: 1 });
    out.push({ key, detail, ifRelaxed: total });
  }
  return out.sort((a, b) => b.ifRelaxed - a.ifRelaxed);
}

// What one piece of evidence is worth, given whether the person wants the thing NEAR or AWAY, and how far it is within the reach in use.
function worth(check: Check, ev: Evidence, reach: Reach): number {
  const away = check.around?.want === 'away';
  if (ev.status === 'unavailable') return 0;
  if (ev.status === 'found') {
    const closeness = ev.meters == null ? 0 : Math.max(0, 1 - ev.meters / REACH_M[reach]);
    const v = WEIGHTS.foundFloor + (WEIGHTS.found - WEIGHTS.foundFloor) * closeness;
    return away ? -v : v;
  }
  return away ? WEIGHTS.awayClear : WEIGHTS.notSeen;
}
const extraBeds = (i: Interpreted, plan: Plan) => (i.hard.beds != null ? WEIGHTS.extraBed * Math.max(0, plan.beds - i.hard.beds) : 0);

// ---------- 2b. scout: what is around each candidate, for what this person's day needs ----------
export async function scout(env: DucktectEnv, s: DucktectSession) {
  if (s.scouted && s.shortlist) return s.candidates!;
  const cands = await findCandidates(env, s);
  const interpreted = s.interpreted!;
  const checks = aroundChecks(interpreted);

  const flatAt = (k: number) => {
    const answered = cands.items.map((c) => c.around[k]!).filter((e) => e.status !== 'unavailable');
    return answered.length >= 20 && answered.filter((e) => e.status === 'found').length / answered.length >= 0.9;
  };
  const flat: boolean[] = [];
  for (const [k, check] of checks.entries()) {
    const withCoords = cands.items.filter((c) => c.plan.lat != null && c.plan.lng != null);
    let search: { places: Place[]; loaded: boolean } | null = null;
    if (env.places && withCoords.length) {
      const m = REACH_M[check.around.reach], lats = withCoords.map((c) => c.plan.lat!), lngs = withCoords.map((c) => c.plan.lng!);
      const dlat = m / 111_320, dlng = m / (111_320 * Math.cos((lats[0]! * Math.PI) / 180));
      try {
        // One query covers every candidate; distances are worked out locally.
        search = await env.places.search({ south: Math.min(...lats) - dlat, north: Math.max(...lats) + dlat, west: Math.min(...lngs) - dlng, east: Math.max(...lngs) + dlng }, check.around.terms, check.around.without);
      } catch {
        s.surroundingsFailed = true;
      }
    }
    const evaluate = (reach: Reach) => {
      for (const c of cands.items) {
        c.around[k] = search && c.plan.lat != null && c.plan.lng != null
          ? surroundingsEvidence(check.need, { ...check.around, reach }, c.plan.lat, c.plan.lng, search.places, search.loaded)
          : unavailable(check.need);
      }
    };
    let reach = check.around.reach;
    evaluate(reach);
    // A need that nearly every home meets at this reach tells places apart no better than one nobody meets. Narrow the reach until it does: "a hospital
    // within a drive" is true of all of LA, "within a bike ride" is not. If even a walk is met nearly everywhere, it is shown but not ranked on.
    while (check.around.want === 'near' && flatAt(k) && tighter(reach)) {
      s.tightened = s.tightened.filter((t) => t.need !== check.need);
      s.tightened.push({ need: check.need, from: check.around.reach, to: tighter(reach)! });
      reach = tighter(reach)!;
      evaluate(reach);
    }
    s.reach[k] = reach;
    flat[k] = check.around.want === 'near' && flatAt(k);
    if (!flat[k]) continue;
    s.tightened = s.tightened.filter((t) => t.need !== check.need); // narrowing did not help, so it is not worth announcing
  }

  s.flatNeeds = checks.filter((_, k) => flat[k]).map((c) => c.need); // still met nearly everywhere within a walk: shown, but not ranked on
  for (const c of cands.items) {
    c.scout = (c.fit.passes ? WEIGHTS.pass : 0) + c.fit.fitPct + extraBeds(interpreted, c.plan) + checks.reduce((n, check, k) => n + (flat[k] ? 0 : worth(check, c.around[k]!, s.reach[k] ?? check.around.reach)), 0);
  }
  s.shortlist = [...cands.items].sort((a, b) => b.scout - a.scout || a.plan.rentMin - b.plan.rentMin).slice(0, SHORTLIST);
  s.scouted = true;
  return cands;
}

// ---------- 3. confirm: re-affirm the shortlist with satellite imagery and property data ----------
export async function confirmWithSatellite(env: DucktectEnv, s: DucktectSession) {
  if (s.evidence) return s.evidence;
  await scout(env, s);
  const labels = imageryLabels(s.interpreted!);
  const evidence = new Map<string, Evidence[]>();
  s.evidence = evidence;
  if (!labels.length) return evidence; // nothing in this person's day needs confirming from above
  const list = s.shortlist!;
  for (let i = 0; i < list.length; i += 3) { // a few at a time: Vexcel asks us not to flood it
    await Promise.all(list.slice(i, i + 3).map(async ({ plan, key }) => {
      const c = plan.communityId && plan.lat != null && plan.lng != null ? { id: plan.communityId, lat: plan.lat, lng: plan.lng } : null;
      const out = c
        ? await aerialEvidence(c, labels, { store: env.aerialStore, vexcel: env.vexcel, budget: env.budget, onFailure: (_call, reason) => { s.aerialIssue ??= reason; env.onFailure?.(reason); } })
        : labels.map((phrase): Evidence => ({ phrase, status: 'unavailable', text: 'Aerial check unavailable.', confidence: null, imagery: null, source: null }));
      evidence.set(key, out);
    }));
  }
  return evidence;
}

// ---------- 4. rank ----------
const status = (xs: Evidence[]): 'ok' | 'partial' | 'unavailable' =>
  !xs.length || xs.every((e) => e.status === 'unavailable') ? 'unavailable' : xs.some((e) => e.status === 'unavailable') ? 'partial' : 'ok';

export async function rank(env: DucktectEnv, s: DucktectSession): Promise<DucktectResult> {
  if (s.result) return s.result;
  const interpreted = s.interpreted ?? interpret(env, s, '');
  const cands = await scout(env, s);
  const sat = await confirmWithSatellite(env, s);
  const checks = aroundChecks(interpreted);
  const labels = imageryLabels(interpreted);
  const list = s.shortlist!;

  // A label that no shortlisted place showed is not evidence of absence: the detector may not recognise it. A label it showed at nearly every place does not
  // tell them apart either ("green space" is everywhere). Say so, and do not rank on either.
  const answered = (l: string) => list.flatMap((c) => sat.get(c.key) ?? []).filter((e) => e.phrase === l && e.status !== 'unavailable');
  const unverified = labels.filter((l) => answered(l).length >= 3 && answered(l).every((e) => e.status === 'not_seen'));
  const undistinguishing = [...labels.filter((l) => answered(l).length >= 4 && answered(l).filter((e) => e.status === 'found').length / answered(l).length >= 0.9), ...s.flatNeeds];
  const unranked = new Set([...unverified, ...undistinguishing]);

  const scored = list.map((c) => {
    const imagery = sat.get(c.key) ?? [];
    const bonus = imagery.reduce((n, e) => n + (unranked.has(e.phrase) ? 0 : e.status === 'found' ? WEIGHTS.found : e.status === 'not_seen' ? WEIGHTS.notSeen : 0), 0);
    const criteria: Criterion[] = [
      ...c.fit.criteria,
      ...checks.map((check, k): Criterion => {
        const ev = c.around[k]!, away = check.around.want === 'away';
        return { key: `around: ${check.need}`, ok: ev.status === 'unavailable' ? null : away ? ev.status === 'not_seen' : ev.status === 'found' ? true : null, detail: ev.text };
      }),
      ...imagery.map((e): Criterion => ({ key: `satellite: ${e.phrase}`, ok: e.status === 'found' ? true : null, detail: e.text })),
      ...interpreted.notChecked.map((w): Criterion => ({ key: `not checked: ${w}`, ok: null, detail: "can't be checked from the data, the map or the satellite" })),
    ];
    return { c, imagery, criteria, score: c.scout + bonus };
  }).sort((a, b) => b.score - a.score || a.c.plan.rentMin - b.c.plan.rentMin);

  const passing = scored.filter((x) => x.c.fit.passes);
  const pick = (x: (typeof scored)[number], i: number): DucktectPick => {
    const p = x.c.plan;
    return {
      rank: i + 1, floorPlanId: p.id, communityId: p.communityId ?? null, community: p.communityName, address: p.address, area: p.lat != null && p.lng != null ? areaLabel(p.lat, p.lng) : null,
      rentFrom: p.rentMin, beds: p.beds, baths: p.baths, sqft: p.sqft, lat: p.lat ?? null, lng: p.lng ?? null,
      passes: x.c.fit.passes, fitPct: x.c.fit.fitPct, score: x.score, criteria: x.criteria, evidence: [...x.c.around, ...x.imagery],
    };
  };
  const top = passing.slice(0, MAX_PICKS);

  const allAround = cands.items.flatMap((c) => c.around);
  const satAll = list.flatMap((c) => sat.get(c.key) ?? []);
  let noResults: DucktectResult['noResults'] = null;
  if (!top.length) {
    const misses = closestMisses(cands.items.map((c) => c.plan), s.needs!, 3);
    noResults = { constraints: s.noResultsConstraints ?? [], closest: misses.map((m) => ({ floorPlanId: m.listing.id, address: (m.listing as Plan).address, relax: m.relax })) };
  }
  const named = interpreted.hard.areas;
  return (s.result = {
    interpreted, picks: top.map(pick),
    alsoConsidered: passing.slice(MAX_PICKS, MAX_PICKS + ALSO_CONSIDERED).map((x) => ({ floorPlanId: x.c.plan.id, address: x.c.plan.address, community: x.c.plan.communityName, rentFrom: x.c.plan.rentMin, fitPct: x.c.fit.fitPct })),
    considered: cands.considered, checked: cands.items.length, shortlisted: list.length, truncated: cands.truncated,
    surroundings: !checks.length ? 'skipped' : status(allAround),
    aerial: !labels.length ? 'skipped' : status(satAll),
    aerialPlaces: list.filter((c) => (sat.get(c.key) ?? []).some((e) => e.status !== 'unavailable')).length,
    tightened: s.tightened, unverified, undistinguishing, noResults,
    area: named.length && cands.viewport ? { names: named, viewport: cands.viewport } : null,
    solo: !env.flockId, viaModel: s.viaModel,
  });
}

// ---------- 5. explain: the model's rationale for this person, held to the facts ----------
const sentence = (s: unknown, n: number) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ').slice(0, n) : '');

// The model writes WHY each pick fits this person's day. Anything with a rent, percentage or other number that is not in the result is dropped:
// the model reasons, it does not get to state facts of its own.
export function explain(s: DucktectSession, input: Rationale): { accepted: number; dropped: string[] } {
  const r = s.result;
  if (!r) return { accepted: 0, dropped: ['no result yet'] };
  const facts = [JSON.stringify(r), JSON.stringify(r.interpreted)];
  const clean = (text: unknown, n: number, what: string, dropped: string[]) => {
    const t = sentence(text, n);
    if (!t) return undefined;
    if (inventedNumbers(t, facts).length) { dropped.push(what); return undefined; }
    return t;
  };
  const dropped: string[] = [];
  const day = clean(input.dailyLife, 260, 'dailyLife', dropped);
  if (day) r.dailyLife = day;
  let accepted = 0;
  for (const p of input.picks ?? []) {
    const pick = r.picks.find((x) => x.rank === p.rank);
    if (!pick) { dropped.push(`rank ${p.rank}`); continue; }
    const why = clean(p.why, 260, `why #${p.rank}`, dropped), tradeOff = clean(p.tradeOff, 180, `tradeOff #${p.rank}`, dropped);
    if (why) { pick.why = why; accepted++; }
    if (tradeOff) pick.tradeOff = tradeOff;
  }
  return { accepted, dropped };
}

// The whole thing without a model: what runs when there is no key, or the model failed or skipped the work. It reads the wish, not the person.
export async function runRules(env: DucktectEnv, s: DucktectSession, text: string): Promise<DucktectResult> {
  s.viaModel = false;
  if (!s.interpreted) interpret(env, s, text);
  return rank(env, s);
}
