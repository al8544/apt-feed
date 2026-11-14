// The Ducktect Deep Agent (docs/DESIGN.md §8.9, ticket T15): an orchestrator and two subagents, READ-ONLY by construction.
// Its own tool list below is the whole of what it can do: none of the flock agent's write tools (update_shortlist, send_invites,
// process_feedback) are given to it, so saving a pick is only ever the person's own tap, through the normal write path.
// The model's one creative job is the interpretation of the wish; the tools return compact facts from lib/agent/ducktect.ts, and the
// ranked result lives in the session, so the UI never has to trust a number the model typed.
import { createDeepAgent, type SubAgent } from 'deepagents';
import { tool, todoListMiddleware } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { MemorySaver } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import * as z from 'zod';
import { DEFAULT_MODEL } from './flock-agent.ts';
import { checkAerial, findCandidates, interpret, rank, type DucktectEnv, type DucktectSession } from './ducktect.ts';
import { DUCKTECT_AERIAL_PROMPT, DUCKTECT_PROMPT, DUCKTECT_SEARCHER_PROMPT } from './prompts.ts';

const json = (v: unknown) => JSON.stringify(v);

const interpretation = z.object({
  hard: z.object({
    maxRent: z.number().nullish().describe('Combined monthly rent in dollars, exactly as the person wrote it'),
    beds: z.number().int().nullish().describe('Bedrooms; 0 for a studio'),
    pets: z.boolean().nullish().describe('true only if they need pets allowed'),
    areas: z.array(z.string()).nullish().describe('Neighborhoods they named, e.g. "Silver Lake"'),
  }),
  visual: z.array(z.string()).describe('Only what aerial imagery can show: swimming pool, tennis court, parking lot, tree cover'),
  notChecked: z.array(z.string()).describe('Everything else they want that cannot be checked: quiet, sunny, near a park, safe'),
});

export function makeDucktectTools(env: DucktectEnv, s: DucktectSession) {
  const interpret_wish = tool(
    async (input) => {
      const out = interpret(env, s, input);
      return json({ interpreted: out, note: 'Visual phrases imagery cannot show were moved to notChecked; areas must be places we can locate.' });
    },
    { name: 'interpret_wish', description: "Record your reading of the wish: hard filters, visual phrases aerial imagery can check, and wishes that cannot be checked. Call once, first.", schema: interpretation },
  );

  const find_candidates = tool(
    async () => {
      const c = await findCandidates(env, s);
      return json({
        placesMatching: c.considered, placesChecked: c.items.length, moreExistedThanWerePulled: c.truncated,
        areaUsed: s.interpreted?.hard.areas.length ? s.interpreted.hard.areas : undefined,
        nothingMatched: c.items.length === 0 ? { constraints: s.noResultsConstraints } : undefined,
      });
    },
    { name: 'find_candidates', description: 'Find the places that pass the hard filters of the wish you interpreted (at most 25 are carried forward).', schema: z.object({}) },
  );

  const check_aerial = tool(
    async () => {
      const ev = await checkAerial(env, s);
      const all = [...ev.values()].flat();
      return json({
        visualPhrases: s.interpreted?.visual ?? [], placesWithEvidence: ev.size,
        found: all.filter((e) => e.status === 'found').length, notSeen: all.filter((e) => e.status === 'not_seen').length, unavailable: all.filter((e) => e.status === 'unavailable').length,
        skipped: !(s.interpreted?.visual.length), note: 'Imagery is evidence, not proof; the ranking tool reads it.',
      });
    },
    { name: 'check_aerial', description: 'Look up aerial-imagery evidence (cached first) for the candidate places and the visual phrases of the wish.', schema: z.object({}) },
  );

  const rank_candidates = tool(
    async () => {
      const r = await rank(env, s);
      return json({
        considered: r.considered, checked: r.checked, aerial: r.aerial, solo: r.solo, interpreted: r.interpreted,
        picks: r.picks.map((p) => ({ rank: p.rank, address: p.address, community: p.community, rentFrom: p.rentFrom, beds: p.beds, fitPct: p.fitPct, evidence: p.evidence.map((e) => e.text) })),
        nothingMatched: r.noResults ?? undefined,
        note: 'rentFrom is the starting monthly rent of the floor plan from a data kit; availability is not confirmed.',
      });
    },
    { name: 'rank_candidates', description: 'Rank the candidates (hard checks, fit, aerial evidence) and return the best options. Call last.', schema: z.object({}) },
  );

  return { interpret_wish, find_candidates, check_aerial, rank_candidates };
}

// Everything the orchestrator and its subagents may call. A test pins this list so a write tool cannot slip in unnoticed.
export const DUCKTECT_TOOL_NAMES = ['interpret_wish', 'find_candidates', 'check_aerial', 'rank_candidates'] as const;

// The client's default is six retries with growing waits, so a model that is down would hold a wish for over a minute. One retry and a
// 60 s timeout per call keep the fallback (the rule-based reading) quick. GPT-5 models reject non-default sampling settings, so none is set.
// Low reasoning effort: reading a wish and calling four tools is routing, not a puzzle, and it cuts the wait a lot.
export const ducktectModel = () => new ChatOpenAI({ model: DEFAULT_MODEL.replace(/^openai:/, ''), maxRetries: 1, timeout: 60_000, reasoning: { effort: 'low' } });

export function createDucktectAgent(opts: { env: DucktectEnv; session: DucktectSession; model?: string | BaseChatModel; saver?: MemorySaver }) {
  const t = makeDucktectTools(opts.env, opts.session);
  const searcher: SubAgent = {
    name: 'apartment-searcher',
    description: 'Finds the places that pass the hard filters of the interpreted wish.',
    systemPrompt: DUCKTECT_SEARCHER_PROMPT,
    tools: [t.find_candidates],
  };
  const aerial: SubAgent = {
    name: 'aerial-evidence',
    description: 'Collects aerial-imagery evidence for the visual phrases of the wish around each candidate. Skip it when the wish has no visual phrase.',
    systemPrompt: DUCKTECT_AERIAL_PROMPT,
    tools: [t.check_aerial],
  };
  return createDeepAgent({
    model: opts.model ?? ducktectModel(),
    systemPrompt: DUCKTECT_PROMPT,
    tools: [t.interpret_wish, t.rank_candidates],
    subagents: [searcher, aerial],
    middleware: [todoListMiddleware()],
    checkpointer: opts.saver ?? new MemorySaver(), // one throwaway thread per request: Ducktect keeps no memory between wishes
  });
}
