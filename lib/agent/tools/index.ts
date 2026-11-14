// The agent's tools (docs/DESIGN.md §8.3). Each returns JSON text made only of facts from the database and lib/match, so
// the model has nothing to invent. The flock and the user come from runtime.context, never from the model's arguments.
import { tool } from 'langchain';
import { closestMisses, fit } from '../../match/listing-fit.ts';
import { combinedBudget } from '../../match/rent-split.ts';
import {
  contextSchema, processFeedbackInput, rankApartmentsInput, searchApartmentsInput, sendInvitesInput, updateShortlistInput,
} from '../schemas.ts';
import type { AgentStore, Plan } from '../store.ts';

const ctxOf = (runtime: { context?: unknown }) => contextSchema.parse(runtime.context);
const json = (v: unknown) => JSON.stringify(v);
const fact = (p: Plan) => ({ id: p.id, address: p.address, community: p.communityName, rentFrom: p.rentMin, beds: p.beds, baths: p.baths, sqft: p.sqft, pets: p.pets });
const NOTE = 'rentFrom is the starting monthly rent of the floor plan from a data kit; availability is not confirmed. null means unknown.';

// "budget: fits the combined budget of $4,700; beds: 3 bd for 3 needed". Built from the checks, so it cannot contain a made-up number.
export const explain = (criteria: { key: string; ok: boolean | null; detail: string }[]) =>
  criteria.map((c) => `${c.key}: ${c.detail}${c.ok === null ? ' (unknown)' : c.ok ? '' : ' (fails)'}`).join('; ');

export function makeTools(store: AgentStore) {
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
      return json({ recorded: true, shortlist: (await store.shortlist(flockId)).map((r) => ({ listingId: r.listingId, status: r.status })) });
    },
    { name: 'process_feedback', description: 'Record why someone rejected a place. Marks it contested on the shortlist.', schema: processFeedbackInput },
  );

  return { search_apartments, rank_apartments, update_shortlist, send_invites, process_feedback };
}
