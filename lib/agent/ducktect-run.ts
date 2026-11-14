// One Ducktect request, start to finish: access, rate limit, the agent, and a result that always arrives (docs/DESIGN.md §8.9, §9, ticket T15).
// The agent is a convenience, not a dependency: with no model key, or a model that fails or skips the work, the same pipeline runs on the
// rule-based reading of the wish, and the result says so (viaModel: false). The browser never sees the model's tokens as facts: it gets steps,
// then one `result` built from the database and tool output, plus the model's summary only when every number in it is in that result.
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type * as z from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { supabaseAerialStore, type AerialStore } from '../enrich/aerial.ts';
import { supabasePlaceStore } from '../enrich/places.ts';
import { createVexcel } from '../enrich/vexcel.ts';
import { adminClient } from '../server/admin.ts';
import { createDucktectAgent } from './ducktect-agent.ts';
import { imageryLabels } from './ducktect-split.ts';
import { confirmWithSatellite, interpret, newSession, rank, scout, type DucktectEnv } from './ducktect.ts';
import { inventedNumbers } from './guard.ts';
import { conciseSummary } from './ducktect-notes.ts';
import { AgentHttpError } from './run.ts';
import type { AgentEvent, ducktectInput } from './schemas.ts';
import { supabaseStore } from './store.ts';
import { ndjson } from './stream.ts';

const DAILY_LIMIT = Number(process.env.AGENT_DAILY_LIMIT ?? 60);
const AERIAL_CALLS = Number(process.env.DUCKTECT_AERIAL_CALLS ?? 10); // Vexcel calls one wish may make; cached answers cost nothing
const RECURSION_LIMIT = 30;
const AGENT_DEADLINE_MS = Number(process.env.DUCKTECT_DEADLINE_MS ?? 75_000); // past this the rules finish the job (the route allows 120 s)

export async function startDucktect(opts: { db: SupabaseClient; userId: string; input: z.infer<typeof ducktectInput>; model?: BaseChatModel }) {
  const { db, userId, input } = opts;
  const text = input.text;
  const flockId = input.flockId ?? null;

  if (flockId) {
    // Active members only (row-level security already hides flocks you are not in).
    const m = await db.from('flock_members').select('status').eq('flock_id', flockId).eq('user_id', userId).eq('status', 'active').maybeSingle();
    if (m.error || !m.data) throw new AgentHttpError(403, 'You are not an active member of this flock.');
  }
  const allowed = await db.rpc('take_agent_call', { p_daily_limit: DAILY_LIMIT });
  if (allowed.error) throw new AgentHttpError(500, allowed.error.message);
  if (allowed.data !== true) throw new AgentHttpError(429, 'Daily agent limit reached. Try again tomorrow.');

  // Aerial cache: read as the user (the tables are public to read); learn new answers through the service role, to those two tables only.
  // It is a cache of public imagery results, not user data, and the agent has no tool that can reach it directly. With no service key
  // (or no Vexcel key) Ducktect serves what is cached and says "unavailable" for the rest.
  let writer: AerialStore | null = null;
  try { writer = supabaseAerialStore(adminClient()); } catch { /* no service key: cache only */ }
  const reader = supabaseAerialStore(db);
  const aerialStore: AerialStore = {
    ...reader,
    saveQueries: (c, b, rows) => (writer ? writer.saveQueries(c, b, rows) : Promise.resolve()),
    saveAttributes: (c, a) => (writer ? writer.saveAttributes(c, a) : Promise.resolve()),
  };
  const live = !!process.env.VEXCEL_API_KEY && !!writer;

  const env: DucktectEnv = {
    store: supabaseStore(db), aerialStore, places: supabasePlaceStore(db), vexcel: live ? createVexcel() : undefined, budget: { calls: AERIAL_CALLS },
    userId, flockId, viewport: input.viewport ?? null, defaults: input.filters,
  };
  const hasModel = !!opts.model || !!process.env.OPENAI_API_KEY;
  const session = newSession(hasModel);

  async function* source(): AsyncGenerator<[string, unknown]> {
    if (!hasModel) return;
    try {
      const agent = createDucktectAgent({ env, session, model: opts.model });
      const it = ((await agent.stream({ messages: [{ role: 'user', content: text }] }, {
        streamMode: ['updates', 'messages'], recursionLimit: RECURSION_LIMIT,
        configurable: { thread_id: `ducktect:${userId}:${randomUUID()}` }, // a fresh thread per wish: no memory between wishes
      } as never)) as AsyncIterable<[string, unknown]>)[Symbol.asyncIterator]();
      const stop = Date.now() + AGENT_DEADLINE_MS;
      for (;;) {
        const left = stop - Date.now();
        const next = await Promise.race([it.next(), new Promise<'late'>((r) => setTimeout(() => r('late'), Math.max(left, 0)))]);
        if (next === 'late') { void it.return?.(undefined); break; } // too slow: stop listening, the session keeps whatever was done
        if (next.done) break;
        yield next.value;
      }
    } catch {
      /* a model that fails is not the end of the request: the rule-based reading below finishes it */
    }
  }

  const steps: string[] = [];
  let answer = '';
  const onEvent = (e: AgentEvent) => {
    if (e.type === 'step') steps.push(e.name);
    if (e.type === 'token') answer += e.text;
  };

  return ndjson(source(), onEvent, {
    drop: (e) => e.type === 'token', // the model's words are never shown as they arrive; its summary is vetted below
    after: async (send) => {
      if (!session.result) {
        // No model, or it failed, or it never ranked: do the work from here, streaming the same steps. It reads the wish, not the person.
        if (!session.interpreted) { session.viaModel = false; send({ type: 'step', name: 'interpret_wish' }); interpret(env, session, text); }
        send({ type: 'step', name: 'area-scout' });
        await scout(env, session);
        if (imageryLabels(session.interpreted!).length) { send({ type: 'step', name: 'aerial-evidence' }); await confirmWithSatellite(env, session); }
        send({ type: 'step', name: 'rank_candidates' });
        await rank(env, session);
      }
      const result = session.result!;
      const summary = conciseSummary(answer);
      // Keep the model's summary (cut to a headline) only if every rent and percentage in it is in the result it was written from.
      if (session.viaModel && summary && inventedNumbers(summary, [JSON.stringify(result)]).length === 0) result.summary = summary;
      send({ type: 'result', result });
      // Audit trail; a failure to log must not break the answer (the run log is written by the server, so under row-level security this may be refused).
      db.from('agent_runs').insert({ flock_id: flockId, user_id: userId, request: `ducktect: ${text}`.slice(0, 500), steps: steps.slice(0, 60), result_summary: (result.summary ?? `${result.picks.length} picks of ${result.considered}`).slice(0, 1000) }).then(() => {}, () => {});
    },
  });
}
