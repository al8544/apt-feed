// One agent request, start to finish: checks, rate limit, streaming, and the agent_runs log (docs/DESIGN.md §8.4, §9).
import type { SupabaseClient } from '@supabase/supabase-js';
import { Command } from '@langchain/langgraph';
import { discover } from '@/lib/server/discover';
import { rerunShortlist } from './feedback.ts';
import { createFlockAgent, threadId } from './flock-agent.ts';
import type { AgentEvent } from './schemas.ts';
import { supabaseStore } from './store.ts';
import { ndjson } from './stream.ts';

const DAILY_LIMIT = Number(process.env.AGENT_DAILY_LIMIT ?? 60);
const RECURSION_LIMIT = 40; // hard cap on graph steps per request

export class AgentHttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Active members only (row-level security already hides flocks you are not in).
async function assertActiveMember(db: SupabaseClient, userId: string, flockId: string) {
  const m = await db.from('flock_members').select('status').eq('flock_id', flockId).eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (m.error || !m.data) throw new AgentHttpError(403, 'You are not an active member of this flock.');
}

// A thumbs-down with reasons, or (no listing) a membership change: record, then search again and update the shortlist.
// Plain code, no model call, so it needs no key and does not spend the agent's daily budget (docs/DESIGN.md §9 /api/agent/feedback).
export async function runFeedback(opts: { db: SupabaseClient; userId: string; flockId: string; listingId?: string; reasons?: string[] }) {
  const { db, userId, flockId, listingId, reasons } = opts;
  await assertActiveMember(db, userId, flockId);
  const store = supabaseStore(db);
  for (const reason of listingId ? (reasons ?? []) : []) await store.recordFeedback(flockId, userId, listingId!, reason);
  const result = await rerunShortlist(store, flockId);
  db.from('agent_runs').insert({ flock_id: flockId, user_id: userId, request: listingId ? `feedback: ${(reasons ?? []).join(', ')}` : 'membership change', steps: ['process_feedback'], result_summary: `${result.outcome}: ${result.savedIds.length} picks` }).then(() => {}, () => {});
  return result;
}

export async function startAgent(opts: { db: SupabaseClient; userId: string; flockId: string; input: { message: string } | { decisions: { type: 'approve' | 'reject'; message?: string }[] } }) {
  const { db, userId, flockId, input } = opts;
  if (!process.env.OPENAI_API_KEY) throw new AgentHttpError(503, 'The agent is not configured on this server (no model key).');

  await assertActiveMember(db, userId, flockId);

  const allowed = await db.rpc('take_agent_call', { p_daily_limit: DAILY_LIMIT });
  if (allowed.error) throw new AgentHttpError(500, allowed.error.message);
  if (allowed.data !== true) throw new AgentHttpError(429, 'Daily agent limit reached. Try again tomorrow.');

  const findFlocks = async (id: string) => {
    const r = await discover(id);
    return 'flocks' in r ? r.flocks.map((f) => ({ flockId: f.id, name: f.name, matchPct: f.matchPct, passes: f.passes, reasons: f.checks.map((c) => c.reason) })) : [];
  };
  const agent = createFlockAgent({ store: supabaseStore(db), findFlocks });
  const payload = 'message' in input ? { messages: [{ role: 'user', content: input.message }] } : new Command({ resume: { decisions: input.decisions } });
  const source = await agent.stream(payload as never, {
    streamMode: ['updates', 'messages'],
    recursionLimit: RECURSION_LIMIT,
    context: { userId, flockId },
    configurable: { thread_id: threadId(flockId, userId) }, // derived here, never taken from the client
  } as never);

  const steps: string[] = [];
  let answer = '';
  const onEvent = (e: AgentEvent) => {
    if (e.type === 'step') steps.push(e.name);
    if (e.type === 'token') answer += e.text;
    if (e.type === 'interrupt') steps.push(`interrupt:${e.actions.map((a) => a.name).join(',')}`);
  };
  const body = ndjson(source as AsyncIterable<[string, unknown]>, (e) => {
    onEvent(e);
    if (e.type === 'done') {
      // Audit trail; a failure to log must not break the answer.
      // The query builder only runs when something awaits it, so chain a no-op handler.
      db.from('agent_runs').insert({
        flock_id: flockId, user_id: userId,
        request: 'message' in input ? input.message : `resume: ${input.decisions.map((d) => d.type).join(',')}`,
        steps: steps.slice(0, 60), result_summary: answer.slice(0, 1000) || null,
      }).then(() => {}, () => {});
    }
  });
  return body;
}
