// How a thumbs-down reason changes the next shortlist (docs/DESIGN.md §8.3 process_feedback, ticket T13).
// Plain code on purpose: the same reasons always give the same shortlist, and a test can pin it. The model only words the answer.
import { fit } from '../match/listing-fit.ts';
import { bedroomsNeeded, combinedBudget } from '../match/rent-split.ts';
import type { AgentStore, Plan } from './store.ts';

// The reason chips on the thumbs-down sheet (Figma 02e).
export const REASONS = ['too far', 'too expensive', 'no pets', 'too small', 'bad photos', 'not my area', 'other'] as const;
export type Reason = (typeof REASONS)[number];
export const isReason = (s: string): s is Reason => (REASONS as readonly string[]).includes(s);

export type Rejection = { plan: Plan; reason: Reason };

// "budget: fits the combined budget of $4,700; beds: 3 bd for 3 needed". Built from the checks, so it cannot contain a made-up number.
export const explain = (criteria: { key: string; ok: boolean | null; detail: string }[]) =>
  criteria.map((c) => `${c.key}: ${c.detail}${c.ok === null ? ' (unknown)' : c.ok ? '' : ' (fails)'}`).join('; ');

// Is `p` ruled out by this rejection? Always the rejected place itself; then whatever the reason says.
// "Too far" uses the members' commute pins when the flock has them: nothing as far or farther than the rejected place.
// shortcut: no pins yet (or no neighborhoods in the kit), so "too far" and "not my area" fall back to ruling out the same community.
export function ruledOut(p: Plan, { plan, reason }: Rejection): boolean {
  if (p.id === plan.id) return true;
  switch (reason) {
    case 'too expensive': return p.rentMin >= plan.rentMin;
    case 'too small': return p.sqft != null && plan.sqft != null && p.sqft <= plan.sqft;
    case 'no pets': return p.pets === false;
    case 'too far':
      if (p.distanceMi != null && plan.distanceMi != null) return p.distanceMi >= plan.distanceMi;
    // falls through to the community rule
    case 'not my area': return !!plan.communityName && p.communityName === plan.communityName;
    default: return false; // bad photos, other
  }
}

// Search again for the flock as it is now (members, budgets) minus everything its thumbs-downs ruled out, and save the top 5.
// Called after a thumbs-down with a reason and after a membership change. Leaves the old shortlist alone when nothing passes.
export async function rerunShortlist(store: AgentStore, flockId: string, runId?: string): Promise<{ savedIds: string[]; ruledOutBy: Reason[] }> {
  const needs = await store.flockNeeds(flockId);
  const rows = await store.feedbackFor(flockId);
  const rejectedPlans = rows.length ? await store.getPlans([...new Set(rows.map((r) => r.listingId))]) : [];
  const byId = new Map(rejectedPlans.map((p) => [p.id, p]));
  const rejections = rows.flatMap((r) => (byId.has(r.listingId) && isReason(r.reason) ? [{ plan: byId.get(r.listingId)!, reason: r.reason }] : []));

  const found = await store.searchPlans({ maxRent: combinedBudget(needs.members), beds: bedroomsNeeded(needs.bedroomsNeeded, needs.members), limit: 100 });
  const miles = await store.distances(flockId, [...new Set([...found.map((p) => p.id), ...rejectedPlans.map((p) => p.id)])]);
  const withMiles = (p: Plan): Plan => ({ ...p, distanceMi: miles.get(p.id) });
  const plans = found.map(withMiles);
  for (const r of rejections) r.plan = withMiles(r.plan);
  const prefersPets = rejections.some((r) => r.reason === 'no pets'); // the kit rarely says, so a known yes goes first
  const petFirst = (p: Plan) => Number(prefersPets && p.pets === true);
  const picks = plans
    .filter((p) => !rejections.some((r) => ruledOut(p, r)))
    .map((plan) => ({ plan, f: fit(plan, needs) }))
    .filter((x) => x.f.passes)
    .sort((a, b) => petFirst(b.plan) - petFirst(a.plan) || b.f.fitPct - a.f.fitPct || a.plan.rentMin - b.plan.rentMin)
    .slice(0, 5);

  const ruledOutBy = [...new Set(rejections.map((r) => r.reason))];
  if (!picks.length) return { savedIds: [], ruledOutBy };
  const ids = picks.map((x) => x.plan.id);
  await store.saveShortlist(flockId, picks.map((x) => ({ listingId: x.plan.id, explanation: explain(x.f.criteria), criteria: x.f.criteria })), runId);
  await store.retireShortlist(flockId, ids);
  return { savedIds: ids, ruledOutBy };
}
