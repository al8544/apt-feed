// The agent's tools (docs/DESIGN.md §8.3). Each returns JSON text made only of facts from the database and lib/match, so
// the model has nothing to invent. The flock and the user come from runtime.context, never from the model's arguments.
import { tool } from 'langchain';
import { closestMisses, fit } from '../../match/listing-fit.ts';
import { combinedBudget } from '../../match/rent-split.ts';
import {
  contextSchema, findOpenFlocksInput, processFeedbackInput, rankApartmentsInput, searchApartmentsInput, sendInvitesInput, updateShortlistInput,
} from '../schemas.ts';
import { explain, rerunShortlist } from '../feedback.ts';
import type { AgentStore, Plan } from '../store.ts';

export { explain };

// Open flocks the caller could join, with coarse reasons only (docs/DESIGN.md §7.4). Supplied by the server so the agent never holds the service key.
export type FlockFinder = (userId: string) => Promise<{ flockId: string; name: string; matchPct: number; passes: boolean; reasons: string[] }[]>;

const ctxOf = (runtime: { context?: unknown }) => contextSchema.parse(runtime.context);
const json = (v: unknown) => JSON.stringify(v);
const fact = (p: Plan) => ({ id: p.id, address: p.address, community: p.communityName, rentFrom: p.rentMin, beds: p.beds, baths: p.baths, sqft: p.sqft, pets: p.pets });
const NOTE = 'rentFrom is the starting monthly rent of the floor plan from a data kit; availability is not confirmed. null means unknown.';

export function makeTools(store: AgentStore, findFlocks?: FlockFinder) {
  const search_apartments = tool(
    async (input) => {
      const plans = await store.searchPlans({ maxRent: input.maxRent, beds: input.beds, limit: 25 });
      return json({ count: plans.length, plans: plans.map(fact), note: NOTE, areasIgnored: input.areas?.length ? 'neighborhoods are not in the data yet, so areas were not applied' : undefined });
    },
    { name: 'search_apartments', description: 'Find floor plans at or under a combined monthly rent with at least this many bedrooms.', schema: searchApartmentsInput },
  );

  const rank_apartments = tool(
    async (input, runtime) => {
      const { flockId } = ctxOf(runtime);
      const [needs, plans] = await Promise.all([store.flockNeeds(flockId), store.getPlans(input.listingIds)]);
      const ranked = plans.map((p) => ({ plan: p, fit: fit(p, needs) })).sort((a, b) => Number(b.fit.passes) - Number(a.fit.passes) || b.fit.fitPct - a.fit.fitPct || a.plan.rentMin - b.plan.rentMin);
      const passing = ranked.filter((r) => r.fit.passes);
      return json({
        combinedBudget: combinedBudget(needs.members), flockSize: needs.size, note: NOTE,
        ranked: ranked.map((r) => ({ ...fact(r.plan), passes: r.fit.passes, fitPct: r.fit.fitPct, criteria: r.fit.criteria, suggestedSplit: r.fit.suggestedSplit })),
        ...(passing.length ? {} : { nothingPasses: true, closestMisses: closestMisses(plans, needs, 3).map((m) => ({ id: m.listing.id, failing: m.failing, relax: m.relax })) }),
      });
    },
    { name: 'rank_apartments', description: "Check floor plans against the flock's combined budget, bedrooms and pets. Returns pass/fail per check with reasons.", schema: rankApartmentsInput },
  );

  const update_shortlist = tool(
    async (input, runtime) => {
      const { flockId } = ctxOf(runtime);
      const [needs, plans] = await Promise.all([store.flockNeeds(flockId), store.getPlans(input.picks.map((p) => p.listingId))]);
      const byId = new Map(plans.map((p) => [p.id, p]));
      const picks = [], rejected: { listingId: string; why: string }[] = [];
      for (const { listingId } of input.picks) {
        const plan = byId.get(listingId);
        if (!plan) { rejected.push({ listingId, why: 'no such floor plan' }); continue; }
        const f = fit(plan, needs);
        if (!f.passes) { rejected.push({ listingId, why: `fails: ${f.criteria.filter((c) => c.ok === false).map((c) => c.key).join(', ')}` }); continue; }
        picks.push({ listingId, explanation: explain(f.criteria), criteria: f.criteria });
      }
      const saved = picks.length ? await store.saveShortlist(flockId, picks) : 0;
      return json({ saved, savedIds: picks.map((p) => p.listingId), rejected });
    },
    { name: 'update_shortlist', description: 'Save the best passing floor plans to the flock shortlist (ids only, at most 5). A pick that fails a check is refused.', schema: updateShortlistInput },
  );

  const send_invites = tool(
    async (input, runtime) => {
      const { flockId } = ctxOf(runtime);
      const results: { username: string; result: string }[] = [];
      for (const username of input.usernames) results.push({ username, result: await store.invite(flockId, username) });
      return json({ results });
    },
    { name: 'send_invites', description: 'Invite people to the flock by username. The user must approve first; invited people still have to accept.', schema: sendInvitesInput },
  );

  const process_feedback = tool(
    async (input, runtime) => {
      const { flockId, userId } = ctxOf(runtime);
      await store.recordFeedback(flockId, userId, input.listingId, input.reason);
      const { savedIds, ruledOutBy } = await rerunShortlist(store, flockId); // the reasons tighten the search in code, not in the model
      return json({ recorded: true, ruledOutBy, shortlistNow: savedIds, note: savedIds.length ? undefined : 'nothing passes after the feedback, so the shortlist was left as it was' });
    },
    { name: 'process_feedback', description: 'Record why someone rejected a place, then search again without what that rules out and update the shortlist.', schema: processFeedbackInput },
  );

  // Read-only, for the roommate-matcher subagent.
  const find_open_flocks = tool(
    async (_input, runtime) => {
      const { userId } = ctxOf(runtime);
      const flocks = findFlocks ? (await findFlocks(userId)).slice(0, 5) : [];
      return json({ count: flocks.length, flocks, note: 'Reasons are coarse on purpose: no one\'s budget, habits or dealbreakers are shown. This only suggests; nothing is saved or sent.' });
    },
    { name: 'find_open_flocks', description: 'List open flocks this person could join, best match first, with coarse reasons.', schema: findOpenFlocksInput },
  );

  return { search_apartments, rank_apartments, update_shortlist, send_invites, process_feedback, find_open_flocks };
}
