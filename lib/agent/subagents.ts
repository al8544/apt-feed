// The Flock agent's specialists (docs/DESIGN.md §8.2, ticket T13). Plain objects: a subagent's tools replace the inherited ones and
// its prompt is not inherited, so each gets only what it needs. Neither can write: the orchestrator owns every write.
import type { SubAgent } from 'deepagents';
import { MATCHER_SUBAGENT_PROMPT, SEARCHER_PROMPT } from './prompts.ts';
import type { makeTools } from './tools/index.ts';

type Tools = ReturnType<typeof makeTools>;

export const apartmentSearcher = (t: Tools): SubAgent => ({
  name: 'apartment-searcher',
  description: 'Turns a housing wish into hard filters and returns ranked floor plans with per-check reasons.',
  systemPrompt: SEARCHER_PROMPT,
  tools: [t.search_apartments, t.rank_apartments],
});

export const roommateMatcher = (t: Tools): SubAgent => ({
  name: 'roommate-matcher',
  description: 'Finds open flocks the person could join and explains the fit. Suggests only; never saves or invites.',
  systemPrompt: MATCHER_SUBAGENT_PROMPT,
  tools: [t.find_open_flocks],
});

// aerial-evidence (Vexcel checks around candidates) is T14/T15: add it here, with its own tools, when that lands.
export const makeSubagents = (t: Tools, withMatcher: boolean): SubAgent[] => [apartmentSearcher(t), ...(withMatcher ? [roommateMatcher(t)] : [])];
