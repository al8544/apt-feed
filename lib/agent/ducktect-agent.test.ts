// Run: node --test lib/agent/ducktect-agent.test.ts
// Drives the real Deep Agent graph with a scripted fake model (no API key, no network, no database), so these tests check OUR wiring:
// the order of the work, the subagents, that nothing can be written, and the stream. They cannot check what a real model says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIMessage } from '@langchain/core/messages';
import { fakeModel } from '@langchain/core/testing';
import { MemorySaver } from '@langchain/langgraph';
import { DUCKTECT_TOOL_NAMES, createDucktectAgent, makeDucktectTools } from './ducktect-agent.ts';
import { newSession } from './ducktect.ts';
import { plan, setup } from './ducktect-testkit.ts';
import { makeTools } from './tools/index.ts';
import type { AgentEvent } from './schemas.ts';
import { toEvents } from './stream.ts';

const WISH = 'sunny 3 bed with a pool and trees near a park, under 4,700';
const ask = (text: string) => ({ messages: [{ role: 'user', content: text }] });
const cfg = { streamMode: ['updates', 'messages'], configurable: { thread_id: 't-1' } } as never;

async function collect(source: AsyncIterable<[string, unknown]>) {
  const events: AgentEvent[] = [];
  for await (const [mode, data] of source) events.push(...toEvents(mode, data));
  return events;
}

// What the model says when it follows the prompt: interpret, delegate to both subagents, rank, answer.
const scripted = (interpretation: Record<string, unknown>, finalText = 'Best option is 1 Test St.') =>
  fakeModel()
    .respondWithTools([{ name: 'interpret_wish', args: interpretation }])
    .respondWithTools([{ name: 'task', args: { description: 'find places', subagent_type: 'apartment-searcher' } }])
    .respondWithTools([{ name: 'find_candidates', args: {} }])
    .respond(new AIMessage('3 places matched'))
    .respondWithTools([{ name: 'task', args: { description: 'collect evidence', subagent_type: 'aerial-evidence' } }])
    .respondWithTools([{ name: 'check_aerial', args: {} }])
    .respond(new AIMessage('evidence collected'))
    .respondWithTools([{ name: 'rank_candidates', args: {} }])
    .respond(new AIMessage(finalText));

const INTERPRETED = { hard: { maxRent: 4700, beds: 3 }, visual: ['swimming pool', 'tree cover'], notChecked: ['sunny', 'park nearby'] };

test('the wish goes through interpret, both subagents and rank, and the ranked result is in the session', async () => {
  const { env } = setup([plan(1, 1, 4000, 3), plan(2, 2, 4200, 3)], { withPool: [2] });
  const session = newSession(true);
  const agent = createDucktectAgent({ env, session, model: scripted(INTERPRETED) as never, saver: new MemorySaver() });
  const events = await collect((await agent.stream(ask(WISH), cfg)) as AsyncIterable<[string, unknown]>);

  const steps = events.filter((e) => e.type === 'step').map((e) => (e as { name: string }).name);
  for (const name of ['interpret_wish', 'apartment-searcher', 'aerial-evidence', 'rank_candidates']) assert.ok(steps.includes(name), `step ${name} streams`);
  assert.ok(steps.indexOf('interpret_wish') < steps.indexOf('apartment-searcher') && steps.indexOf('aerial-evidence') < steps.indexOf('rank_candidates'), 'in that order');

  const r = session.result!;
  assert.equal(r.viaModel, true);
  assert.deepEqual(r.picks.map((p) => p.community), ['Place 2', 'Place 1'], 'the place with a pool in the imagery ranks first');
  assert.deepEqual(r.interpreted.notChecked, ['sunny', 'park nearby']);
  const ranked = events.find((e) => e.type === 'tool_result' && e.name === 'rank_candidates');
  assert.ok(ranked && ranked.type === 'tool_result' && ranked.content.includes('2 Test St') && !ranked.content.includes('"lat"'), 'the model is handed compact facts, not raw rows');
});

test('the model\'s split is held to the rules: an imagery "visual" phrase it cannot show lands in not-checked', async () => {
  const { env } = setup([plan(1, 1, 4000, 3)]);
  const session = newSession(true);
  const sloppy = { hard: { maxRent: 4700, beds: 3 }, visual: ['pool', 'park', 'good light'], notChecked: [] };
  await collect((await createDucktectAgent({ env, session, model: scripted(sloppy) as never, saver: new MemorySaver() }).stream(ask(WISH), cfg)) as AsyncIterable<[string, unknown]>);
  assert.deepEqual(session.result!.interpreted.visual, ['swimming pool']);
  assert.deepEqual(session.result!.interpreted.notChecked, ['park', 'good light']);
});

// ---------- read-only by construction (ticket T15: "assert no write tools") ----------
test('its tools are exactly the four read-only ones, and none of the flock agent\'s write tools', () => {
  const { env } = setup([plan(1, 1, 4000, 3)]);
  const names = Object.keys(makeDucktectTools(env, newSession(true)));
  assert.deepEqual([...names].sort(), [...DUCKTECT_TOOL_NAMES].sort());
  const writers = ['update_shortlist', 'send_invites', 'process_feedback'];
  assert.deepEqual(Object.keys(makeTools(env.store)).filter((n) => writers.includes(n)).sort(), [...writers].sort(), 'sanity: those are the write tools');
  assert.deepEqual(names.filter((n) => writers.includes(n) || /^(update|send|save|delete|write|insert|invite)_/.test(n)), []);
});

test('even a model that tries to save a pick changes nothing: that tool does not exist for it', async () => {
  const { env, store } = setup([plan(1, 1, 4000, 3)], { flock: true });
  const model = fakeModel()
    .respondWithTools([{ name: 'update_shortlist', args: { picks: [{ listingId: plan(1, 1, 1, 1).id }] } }])
    .respondWithTools([{ name: 'send_invites', args: { usernames: ['maya.k'] } }])
    .respond(new AIMessage('done'));
  const events = await collect((await createDucktectAgent({ env, session: newSession(true), model: model as never, saver: new MemorySaver() }).stream(ask('save the first one'), cfg)) as AsyncIterable<[string, unknown]>);
  assert.equal(store.saved.size + store.invited.length + store.feedback.length, 0, 'nothing saved, invited or recorded');
  const refused = events.filter((e) => e.type === 'tool_result' && /not a valid tool|not found|no such tool/i.test(e.content));
  assert.ok(refused.length >= 1, 'the graph answered the model that no such tool exists');
});

test('a model that skips the work still leaves the session ready: rank runs the steps before it', async () => {
  const { env } = setup([plan(1, 1, 4000, 3)]);
  const session = newSession(true);
  const model = fakeModel().respondWithTools([{ name: 'interpret_wish', args: INTERPRETED }]).respondWithTools([{ name: 'rank_candidates', args: {} }]).respond(new AIMessage('ok'));
  await collect((await createDucktectAgent({ env, session, model: model as never, saver: new MemorySaver() }).stream(ask(WISH), cfg)) as AsyncIterable<[string, unknown]>);
  assert.equal(session.result!.picks.length, 1);
  assert.equal(session.result!.aerial, 'ok', 'the aerial step ran even though the model never asked for it');
});
