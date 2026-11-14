// Ducktect best option: the work behind the search bar's "Ducktect best option" (docs/DESIGN.md §8.9, ticket T15).
// A wish becomes ranked picks with aerial evidence in four steps: interpret, find candidates, check aerial, rank. All of it is code over the
// database and Vexcel; the model only proposes the interpretation (and writes a short summary), so it has nothing to invent: every number the
// UI shows comes from the result built here. Read-only: nothing in this file writes flock data.
import { closestMisses, fit } from '../match/listing-fit.ts';
import { combinedBudget } from '../match/rent-split.ts';
import type { Criterion, Fit } from '../match/types.ts';
import { aerialEvidence, type AerialStore, type Evidence } from '../enrich/aerial.ts';
import type { Reason, Vexcel } from '../enrich/vexcel.ts';
import { normalizeInterpretation, ruleSplit, viewportFor, type Interpreted, type RawInterpretation } from './ducktect-split.ts';
import type { AgentStore, CandidateQuery, Needs, Plan, Viewport } from './store.ts';

// ---------- how picks are ranked (documented weights, §8.9 step 6) ----------
// score = (passes every hard check ? PASS : 0) + fit % (0 to 100) + a bonus or penalty per visual phrase the person asked for
//         + EXTRA_BED for each bedroom above the number asked for (a 6-bedroom plan is not a good answer to "3 bed").
// "Not seen" only nudges: imagery cannot rule a pool out, so it never eliminates a place. "Unavailable" counts for nothing either way.
export const WEIGHTS = { pass: 1000, found: 25, notSeen: -5, extraBed: -4 } as const;
export const CANDIDATE_CAP = 25; // places checked against aerial imagery; more than this and the result says "checked 25 of N"
export const MAX_PICKS = 5;
export const ALSO_CONSIDERED = 3;
const FETCH_LIMIT = 500; // plans pulled from the database before narrowing to places

export type DucktectPick = {
  rank: number;
  floorPlanId: string; communityId: string | null; community: string | null; address: string;
  rentFrom: number; beds: number; baths: number; sqft: number | null; lat: number | null; lng: number | null;
  passes: boolean; fitPct: number; score: number;
  criteria: Criterion[]; // every hard check, each visual phrase asked for, and each wish nobody can check
  evidence: Evidence[];
};
export type Constraint = { key: 'rent' | 'beds' | 'pets' | 'area'; detail: string; ifRelaxed: number }; // "dropping this would give N places"
export type DucktectResult = {
  interpreted: Interpreted;
  picks: DucktectPick[];
  alsoConsidered: { floorPlanId: string; address: string; community: string | null; rentFrom: number; fitPct: number }[];
  considered: number; // places that passed the hard filters
  checked: number; // places scored and aerial-checked (at most CANDIDATE_CAP)
  truncated: boolean; // more matching plans existed than were pulled, so "considered" is a floor
  aerial: 'ok' | 'partial' | 'unavailable' | 'skipped'; // skipped: the wish had no visual phrase
  aerialPlaces: number; // of the places checked, how many got any aerial answer (cached or live); the rest read "unavailable"
  noResults: { constraints: Constraint[]; closest: { floorPlanId: string; address: string; relax: string[] }[] } | null;
  area: { names: string[]; viewport: Viewport } | null; // a named place overrides the map: the map should move there
  solo: boolean; // no flock: you are a flock of one
  viaModel: boolean;
  summary?: string; // the model's own words, kept only if every number in it appears in the result
};

// ---------- one request's state, and what it may use ----------
export type DucktectEnv = {
  store: AgentStore;
  aerialStore: AerialStore;
  vexcel?: Vexcel; // leave out for cache only
  budget: { calls: number }; // Vexcel calls this request may make
  userId: string;
  flockId?: string | null;
  viewport?: Viewport | null; // what the map shows; used when the wish names no place
  defaults?: { maxRent?: number; beds?: number; pets?: boolean }; // the map's own filters, used where the wish says nothing
  onFailure?: (reason: Reason) => void;
};
type Candidate = { plan: Plan; fit: Fit };
export type DucktectSession = {
  interpreted: Interpreted | null;
  needs: Needs | null;
  candidates: { items: Candidate[]; considered: number; truncated: boolean; viewport: Viewport | null } | null;
  noResultsConstraints: Constraint[] | null;
  evidence: Map<string, Evidence[]> | null; // by community id
  aerialIssue: Reason | null;
  result: DucktectResult | null;
  viaModel: boolean;
};
export const newSession = (viaModel: boolean): DucktectSession => ({ interpreted: null, needs: null, candidates: null, noResultsConstraints: null, evidence: null, aerialIssue: null, result: null, viaModel });

// ---------- 1. interpret ----------
export function interpret(env: DucktectEnv, s: DucktectSession, raw: RawInterpretation | string): Interpreted {
  const base = typeof raw === 'string' ? ruleSplit(raw) : normalizeInterpretation(raw);
  const d = env.defaults ?? {};
  // The wish wins; the map's filters only fill what it left unsaid.
  s.interpreted = { ...base, hard: { ...base.hard, ...(base.hard.maxRent == null && d.maxRent != null ? { maxRent: d.maxRent } : {}), ...(base.hard.beds == null && d.beds != null ? { beds: d.beds } : {}), ...(!base.hard.pets && d.pets ? { pets: true } : {}) } };
  s.needs = s.candidates = s.evidence = s.result = null;
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

// ---------- 2. find candidates ----------
export async function findCandidates(env: DucktectEnv, s: DucktectSession) {
  if (s.candidates) return s.candidates;
  const interpreted = s.interpreted ?? interpret(env, s, '');
  const hard = interpreted.hard;
  const needs = (s.needs ??= await needsFor(env, hard));
  const noBudget = hard.maxRent == null && combinedBudget(needs.members) === 0;
  const named = viewportFor(hard.areas);
  const viewport = named ?? env.viewport ?? null; // area precedence: a place in the text beats the map
  const q: CandidateQuery = { maxRent: hard.maxRent ?? (combinedBudget(needs.members) || undefined), beds: hard.beds, pets: hard.pets, viewport: viewport ?? undefined, limit: FETCH_LIMIT };

  const { plans, total } = await env.store.findCandidates(q);
  const scored = plans.map((plan) => ({ plan, fit: noBudget ? withoutBudget(fit(plan, needs)) : fit(plan, needs) }));
  // Bedrooms above what was asked count against a plan when choosing who gets one of the 25 places (and again in rank()).
  const extra = (c: Candidate) => (hard.beds != null ? Math.max(0, c.plan.beds - hard.beds) : 0);
  const better = (a: Candidate, b: Candidate) => Number(a.fit.passes) - Number(b.fit.passes) || a.fit.fitPct - b.fit.fitPct || extra(b) - extra(a) || b.plan.rentMin - a.plan.rentMin; // > 0: a is the better plan
  // One place, one candidate: its best plan (passes, then fit, then the lower rent). Vexcel looks at a place, not a floor plan.
  const best = new Map<string, Candidate>();
  for (const c of scored) {
    const key = c.plan.communityId ?? c.plan.id;
    const cur = best.get(key);
    if (!cur || better(c, cur) > 0) best.set(key, c);
  }
  const places = [...best.values()].sort((a, b) => better(b, a));
  s.candidates = { items: places.slice(0, CANDIDATE_CAP), considered: places.length, truncated: total > plans.length, viewport };
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

// ---------- 3. check aerial ----------
export async function checkAerial(env: DucktectEnv, s: DucktectSession) {
  if (s.evidence) return s.evidence;
  const { items } = await findCandidates(env, s);
  const visual = s.interpreted?.visual ?? [];
  const evidence = new Map<string, Evidence[]>();
  s.evidence = evidence;
  if (!visual.length) return evidence; // no visual phrase in the wish: skip the aerial step
  for (let i = 0; i < items.length; i += 3) { // a few at a time: Vexcel asks us not to flood it
    await Promise.all(items.slice(i, i + 3).map(async ({ plan }) => {
      const c = plan.communityId && plan.lat != null && plan.lng != null ? { id: plan.communityId, lat: plan.lat, lng: plan.lng } : null;
      const out = c
        ? await aerialEvidence(c, visual, { store: env.aerialStore, vexcel: env.vexcel, budget: env.budget, onFailure: (_call, reason) => { s.aerialIssue ??= reason; env.onFailure?.(reason); } })
        : visual.map((phrase): Evidence => ({ phrase, status: 'unavailable', text: 'Aerial check unavailable.', confidence: null, imagery: null, source: null }));
      evidence.set(plan.communityId ?? plan.id, out);
    }));
  }
  return evidence;
}

// ---------- 4. rank ----------
export async function rank(env: DucktectEnv, s: DucktectSession): Promise<DucktectResult> {
  if (s.result) return s.result;
  const interpreted = s.interpreted ?? interpret(env, s, '');
  const cands = await findCandidates(env, s);
  const evidence = await checkAerial(env, s);
  const wanted = interpreted.visual;

  const scored = cands.items.map(({ plan, fit: f }) => {
    const ev = evidence.get(plan.communityId ?? plan.id) ?? [];
    const bonus = ev.reduce((n, e) => n + (e.status === 'found' ? WEIGHTS.found : e.status === 'not_seen' ? WEIGHTS.notSeen : 0), 0)
      + (interpreted.hard.beds != null ? WEIGHTS.extraBed * Math.max(0, plan.beds - interpreted.hard.beds) : 0);
    const criteria: Criterion[] = [
      ...f.criteria,
      ...ev.map((e): Criterion => ({ key: `aerial: ${e.phrase}`, ok: e.status === 'found' ? true : null, detail: e.text })),
      ...interpreted.notChecked.map((w): Criterion => ({ key: `not checked: ${w}`, ok: null, detail: "can't be checked from the data or aerial imagery" })),
    ];
    return { plan, f, ev, criteria, score: (f.passes ? WEIGHTS.pass : 0) + f.fitPct + bonus };
  }).sort((a, b) => b.score - a.score || a.plan.rentMin - b.plan.rentMin);

  const passing = scored.filter((x) => x.f.passes);
  const top = passing.slice(0, MAX_PICKS);
  const pick = (x: (typeof scored)[number], i: number): DucktectPick => ({
    rank: i + 1, floorPlanId: x.plan.id, communityId: x.plan.communityId ?? null, community: x.plan.communityName, address: x.plan.address,
    rentFrom: x.plan.rentMin, beds: x.plan.beds, baths: x.plan.baths, sqft: x.plan.sqft, lat: x.plan.lat ?? null, lng: x.plan.lng ?? null,
    passes: x.f.passes, fitPct: x.f.fitPct, score: x.score, criteria: x.criteria, evidence: x.ev,
  });

  const allEvidence = [...evidence.values()].flat();
  const aerial: DucktectResult['aerial'] = !wanted.length ? 'skipped' : !allEvidence.length || allEvidence.every((e) => e.status === 'unavailable') ? 'unavailable' : allEvidence.some((e) => e.status === 'unavailable') ? 'partial' : 'ok';

  let noResults: DucktectResult['noResults'] = null;
  if (!top.length) {
    const needs = s.needs!;
    const misses = closestMisses(cands.items.map((c) => c.plan), needs, 3);
    noResults = { constraints: s.noResultsConstraints ?? [], closest: misses.map((m) => ({ floorPlanId: m.listing.id, address: (m.listing as Plan).address, relax: m.relax })) };
  }
  const named = interpreted.hard.areas;
  return (s.result = {
    interpreted, picks: top.map(pick),
    alsoConsidered: passing.slice(MAX_PICKS, MAX_PICKS + ALSO_CONSIDERED).map((x) => ({ floorPlanId: x.plan.id, address: x.plan.address, community: x.plan.communityName, rentFrom: x.plan.rentMin, fitPct: x.f.fitPct })),
    considered: cands.considered, checked: cands.items.length, truncated: cands.truncated, aerial,
    aerialPlaces: [...evidence.values()].filter((e) => e.some((x) => x.status !== 'unavailable')).length, noResults,
    area: named.length && cands.viewport ? { names: named, viewport: cands.viewport } : null,
    solo: !env.flockId, viaModel: s.viaModel,
  });
}

// The whole thing without a model: what runs when there is no key, or the model failed or skipped the work.
export async function runRules(env: DucktectEnv, s: DucktectSession, text: string): Promise<DucktectResult> {
  s.viaModel = false;
  if (!s.interpreted) interpret(env, s, text);
  return rank(env, s);
}
