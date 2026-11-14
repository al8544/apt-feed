// The Flock Deep Agent (docs/DESIGN.md §8, ticket T12): an orchestrator that owns the writes plus an apartment-searcher subagent.
// roommate-matcher and aerial-evidence arrive with T13 and T14.
import { createDeepAgent, type SubAgent } from 'deepagents';
import { todoListMiddleware } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { FLOCK_PROMPT, SEARCHER_PROMPT } from './prompts.ts';
import { contextSchema } from './schemas.ts';
import type { AgentStore } from './store.ts';
import { makeTools } from './tools/index.ts';

// One model for now: OpenAI gpt-5-mini (needs OPENAI_API_KEY). GPT-5 models reject non-default sampling settings, so we set none.
export const DEFAULT_MODEL = 'openai:gpt-5-mini';

// Demo only: pauses and threads live in this process, so use a long-lived Node host (docs/DESIGN.md §8.6). Persistent checkpointer for anything durable.
export const checkpointer = new MemorySaver();

// The thread id is derived on the server, never accepted from the client.
export const threadId = (flockId: string, userId: string) => `flock:${flockId}:user:${userId}`;

export function createFlockAgent(opts: { store: AgentStore; model?: string | BaseChatModel; saver?: MemorySaver }) {
  const t = makeTools(opts.store);
  const apartmentSearcher: SubAgent = {
    name: 'apartment-searcher',
    description: 'Turns a housing wish into hard filters and returns ranked floor plans with per-check reasons.',
    systemPrompt: SEARCHER_PROMPT,
    tools: [t.search_apartments, t.rank_apartments], // least privilege: it cannot write
  };
  return createDeepAgent({
    model: opts.model ?? DEFAULT_MODEL,
    systemPrompt: FLOCK_PROMPT,
    tools: [t.update_shortlist, t.send_invites, t.process_feedback],
    subagents: [apartmentSearcher],
    middleware: [todoListMiddleware()],
    contextSchema,
    interruptOn: { send_invites: { allowedDecisions: ['approve', 'reject'] } },
    checkpointer: opts.saver ?? checkpointer,
  });
}
